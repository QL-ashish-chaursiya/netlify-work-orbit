# Build Prompt for Claude Code
## Resource Allocation & Workforce Planning Platform (Multi-Tenant SaaS)

Paste this whole document into Claude Code as your project brief. It references `schema.sql` (in the same folder) as the source of truth for the database.

---

## 1. What we're building

A multi-tenant B2B SaaS platform (like greytHR, but for resource allocation instead of payroll/HR) that helps companies track who's allocated to what project, plan releases in advance, discover available expertise, spot idle resources, and track Sales POC-to-client conversion.

Each customer company is an isolated **Organization (tenant)**. A company owner signs up, becomes that org's **Admin**, and provisions everyone else — either one at a time (with an email invite) or via a bulk Excel/CSV upload (silent account creation, no email).

---

## 2. Tech stack — use exactly this

| Layer | Choice |
|---|---|
| Frontend framework | React (Vite) |
| Language | TypeScript, strict mode |
| Backend / DB / Auth | Supabase (Postgres + Auth + Edge Functions + Storage) |
| Routing | React Router v6 |
| Server state / data fetching | **TanStack Query** — all Supabase reads/writes go through query/mutation hooks, never raw `useEffect` + `fetch` |
| Client/UI state | **Zustand** — only for pure UI state (active role view, sidebar, modal open/closed, wizard step). Never store server data in Zustand. |
| Forms | react-hook-form |
| Schema validation | **Zod**, shared between `react-hook-form` (via `@hookform/resolvers/zod`) and Edge Function input validation |
| Components | shadcn/ui |
| Styling | Tailwind CSS |
| Data tables | **TanStack Table** (for Employee list, Resource directory, Bench report, Approval queue) |
| Charts | **Recharts** (utilization %, POC conversion trend, bench strength) |
| Excel/CSV parsing | **SheetJS** (xlsx) — client-side parse before validation preview screen |
| Dates | **date-fns** |
| Toasts | **Sonner** |
| Icons | lucide-react |

Do not introduce Redux, MobX, Axios (use Supabase client / fetch), or any CSS-in-JS library. Do not hand-roll a data-fetching layer — everything server-related goes through TanStack Query hooks wrapping `supabase-js` calls.

---

## 3. Database

Run `schema.sql` as the initial migration. It already includes:
- All tables (organizations, profiles, projects, allocations, allocation_requests, pocs, notifications, bulk_import_jobs, plans/subscriptions, etc.)
- Enums for every status field — use these enum values verbatim in TypeScript types (generate types via `supabase gen types typescript`, don't hand-write duplicate types)
- Row Level Security policies enforcing tenant isolation on every table via `auth_org_id()`
- Helper Postgres functions: `auth_org_id()`, `auth_role()`, `auth_has_role(role)`, `create_organization_and_admin(company_name, full_name)`, `check_seat_limit()` trigger
- Seed data for the 4 subscription plans

**Do not bypass RLS.** Every query from the client relies on RLS for tenant isolation — never add a client-side `.eq('organization_id', ...)` filter as a substitute for RLS; it's a defense-in-depth layer, not the primary control.

---

## 4. Authentication — build exactly these two account-creation paths

### Path A — Company signup (creates a new tenant + its first Admin)
1. User fills company name, full name, email, password on the signup screen.
2. Call `supabase.auth.signUp({ email, password })`.
3. Immediately call the RPC `create_organization_and_admin(p_company_name, p_full_name)` — this creates the `organizations` row and the Admin's `profiles` row in one transaction, with `status = 'active'` and `provisioning_source = 'self_signup_admin'`. `organizations.plan` defaults to `trial` and `seat_limit` defaults to 25 automatically — no plan-selection step needed.
4. Redirect into a short Org Setup step (business functions/departments only — no billing/plan UI).

### Path B — Admin adds an employee individually
1. Admin fills the Add Employee form (name, email, role, reporting manager, designation).
2. Call an Edge Function (`invite-employee`) that uses the **Supabase Admin API** `inviteUserByEmail()` — this creates the `auth.users` row *and* sends Supabase's built-in invite email with a set-password link.
3. On success, insert the corresponding `profiles` row with `status = 'invited'`, `provisioning_source = 'individual_invite'`.
4. Employee clicks the email link — lands on Supabase's password-set flow — account becomes `active`.

### Path C — Admin bulk-imports employees via Excel/CSV
**Critical requirement: no email is sent for this path.** First login for these employees is via Forgot Password.
1. Admin uploads a file — parse client-side with SheetJS — show the validation preview screen (valid rows vs. error rows, per-row reasons: duplicate email, missing field, unrecognized role, reporting manager not found).
2. On confirm, call an Edge Function (`bulk-import-employees`) that, for each valid row:
   - Uses the **Supabase Admin API** `createUser()` with `email_confirm: true` and **no password set**, and critically **do not** trigger any invite/confirmation email (this is the Admin API call that creates the account silently — verify against current Supabase Admin API docs during implementation, since email-sending behavior on `createUser` vs `inviteUserByEmail` is the exact distinction this path depends on).
   - Inserts the `profiles` row with `status = 'pending_activation'`, `provisioning_source = 'bulk_import'`, `bulk_import_job_id` set.
   - Logs the row into `bulk_import_jobs` / `bulk_import_error_rows` as appropriate.
3. Employee's first login: they go to the normal Login screen, enter their email, click **Forgot Password**, get the reset email, set a password — account flips to `active`.
4. Employee list screen shows these rows as **Pending Activation** (distinct badge from `invited`) until they complete that first reset.

### Login (all roles, always)
- Email + password only. No SSO, no domain-based self-join, no magic links.
- On success, redirect based on `profiles.primary_role` (and show a role switcher if `user_roles` has more than one entry for that user).
- Standard Supabase session handling; expired session redirects to `/login` preserving the intended destination.

---

## 5. Core feature modules — build in this order

### Phase 1 — Foundation
- Supabase project setup, run `schema.sql`, generate TypeScript types
- Auth: signup (Path A), login, forgot password, session handling, protected routes by role
- App shell: sidebar nav (role-aware), topbar, role-based dashboard routing

### Phase 2 — Employee Management
- Add Employee (individual, Path B)
- Bulk Import (Path C): upload → SheetJS parse → validation preview → confirm → Edge Function
- Employee list (TanStack Table): status badges (Invited / Pending Activation / Active / Deactivated), resend invite, deactivate
- Profile completion screen (skills, designation) shown once on first login for non-admins

### Phase 3 — Projects & Allocations
- Admin: Create Project (Draft status)
- PM: Define role requirements on a project
- Tech Lead / PM: Expertise Search (filter by skill, utilization, availability) → Resource profile detail
- Allocation Requests: raise (hard allocation / soft reservation), conflict detection (overlapping dates on same resource), routing to RM
- RM: Approval Queue (approve/reject/request info), conflict arbitration view
- Allocation lifecycle: project status transitions Draft → Staffing → In Progress → Releasing → Closed, enforcing the rule that a project **cannot** be closed while any allocation is still `active` (block in the UI and double-enforce with a Postgres check, e.g. a trigger or Edge Function guard on the close action)

### Phase 4 — Release Planning
- PM: mark allocation `planned_for_release` with a target date
- Reminder logic (Edge Function on a schedule, or Supabase cron) notifying PM as the date approaches
- Confirm / Extend actions
- Release calendar view (Tech Lead + RM)

### Phase 5 — Utilization, Bench & Reporting
- Utilization dashboard (allocation % vs. availability, per resource)
- Bench report: resources below `idle_thresholds.threshold_percent`, filterable
- Over-allocation flag (>100%)
- Executive dashboard: org-wide utilization, bench strength, trends (Recharts)

### Phase 6 — Sales POC & Conversion Tracking
- Log POC (client, dates, resources engaged, linked allocation)
- Set outcome (Pending / Closed-Won / Closed-Lost)
- Monthly dashboard: POCs per month, conversion rate, drill-down
- On Closed-Won, optional flow to convert POC into a new Project (pre-fills client name, links `source_poc_id`)

### Phase 7 — Notifications
- In-app notification bell + list (Sonner for toast on new events)
- `notification_rules` respected per role/event type

**Billing/subscriptions are intentionally out of scope for this build.** `organizations.plan` and `organizations.seat_limit` exist as simple fields (manually set, default trial/25 seats) purely so seat-limit enforcement works without payment infrastructure. Do not build Stripe integration, plan selection UI, or `canUseFeature` gating — that's a future phase. Seat limit enforcement (the `check_seat_limit` Postgres trigger) is already active server-side; surface a plain "seat limit reached, contact your Admin" message in the UI when the Add Employee or Bulk Import action hits it — no upgrade-prompt UI needed yet.

---

## 6. Conventions

- **Folder structure**: feature-based (`/features/projects`, `/features/allocations`, `/features/employees`, `/features/pocs`, etc.), each with its own `components/`, `hooks/` (TanStack Query hooks), `types.ts`.
- **Every Supabase read/write** goes through a typed hook, e.g. `useProjects()`, `useCreateAllocationRequest()` — no inline `supabase.from(...)` calls inside components.
- **Every form** uses react-hook-form + a Zod schema defined once and reused for both client validation and Edge Function input validation where applicable.
- **Role-based UI gating**: a `useAuthRole()` hook (Zustand or context, populated from the session) drives what nav items/actions render — but never rely on UI hiding alone; RLS is the real enforcement layer.
- **Status badges**: consistent color mapping across the app for each enum (e.g. `pending` = amber, `approved`/`active` = green, `rejected`/`cancelled` = red, `deactivated`/`closed` = gray) — define once in a shared constants file.
- **Optimistic updates**: use TanStack Query mutations with optimistic updates for fast actions (approve/reject, mark for release) so the UI feels instant, with rollback on error.

---

## 7. Explicit edge-case handling to build in (not optional polish)

- Block closing a project with any `active` allocation still attached (Phase 3).
- Block deactivating the last remaining Admin in an organization.
- Bulk import: partial success is normal — valid rows import, error rows are reported separately with a downloadable error report; never fail the whole batch for a few bad rows.
- Self-approval block: a user cannot approve their own allocation request, even if they technically hold the RM role.
- Seat limit: enforced both server-side (trigger, already in schema) and pre-emptively in the UI before the bulk import or add-employee action is attempted.
- Expired reset-password link (bulk-import first-login path): show a clear "request a new link" action, not a dead end.

---

## 8. What to ask me before building, if unclear

If you (Claude Code) hit a decision not covered here or in `schema.sql` — e.g., exact escalation timing when a PM ignores a release reminder, or whether PMs can self-create projects — stop and ask rather than guessing, since these affect data model shape.
