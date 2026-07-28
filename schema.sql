-- ============================================================================
-- Resource Allocation & Workforce Planning Platform
-- Complete Supabase/Postgres Schema (multi-tenant, RLS-enforced)
-- ============================================================================
-- Run as a single migration, or split by section into sequential migrations.
-- Assumes Supabase Auth (auth.users) as the identity source.
--
-- NOTE: this file is kept verbatim as the reference brief. The actual applied
-- migrations live in supabase/migrations/ — see 0001_init.sql (this content,
-- with the broken trg_subscriptions_updated_at trigger removed since no
-- `subscriptions` table exists in this schema) and 0002_supplementary_rls_and_guards.sql
-- (missing RLS policies + business-rule triggers this file flags as TODO).
-- ============================================================================


-- ============================================================================
-- SECTION 0: EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================
create type user_role as enum (
  'admin',
  'resource_manager',
  'project_manager',
  'tech_lead',
  'team_member',
  'sales_lead'
);

create type account_status as enum (
  'invited',      -- individually added, invite email sent, password not set
  'pending_activation', -- bulk-imported, no email sent, awaiting forgot-password activation
  'active',
  'deactivated'
);

create type provisioning_source as enum (
  'individual_invite',
  'bulk_import',
  'self_signup_admin'  -- the org-creating signup itself
);

create type project_status as enum (
  'draft',
  'staffing',
  'in_progress',
  'releasing',
  'closed',
  'cancelled'
);

create type allocation_status as enum (
  'soft_reserved',
  'active',
  'planned_for_release',
  'released',
  'cancelled'
);

create type request_type as enum (
  'hard_allocation',
  'soft_reservation'
);

create type request_status as enum (
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'conflict_flagged'
);

create type poc_outcome as enum (
  'pending',
  'closed_won',
  'closed_lost'
);

create type import_job_status as enum (
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);

create type plan_tier as enum (
  'trial',
  'starter',
  'growth',
  'enterprise'
);


-- ============================================================================
-- SECTION 2: ORGANIZATIONS (TENANTS)
-- ============================================================================
create table organizations (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  slug              text unique,                       -- optional, for future subdomain use
  industry          text,
  company_size      text,
  plan              plan_tier not null default 'trial',
  seat_limit        integer not null default 25,
  trial_ends_at     timestamptz default (now() + interval '14 days'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table organizations is 'One row per customer company (tenant). Root of all tenant isolation.';


-- ============================================================================
-- SECTION 3: PROFILES (1:1 with auth.users, tenant-scoped)
-- ============================================================================
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  full_name             text not null,
  email                 text not null,
  primary_role          user_role not null,
  designation           text,
  business_function_id  uuid,  -- fk added after business_functions table exists
  reporting_manager_id  uuid references profiles(id),
  status                account_status not null default 'invited',
  provisioning_source   provisioning_source not null default 'individual_invite',
  invited_by            uuid references profiles(id),
  bulk_import_job_id    uuid,  -- fk added after bulk_import_jobs table exists
  profile_completed_at  timestamptz,
  deactivated_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (organization_id, email)   -- email unique per tenant, not globally
);

comment on table profiles is 'Every platform user. status + provisioning_source drive the two activation paths: individual_invite (email sent) vs bulk_import (silent, activates via forgot-password).';

create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_manager on profiles(reporting_manager_id);

-- Supports a user holding more than one role (e.g. Tech Lead who is also a PM)
create table user_roles (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        user_role not null,
  created_at  timestamptz not null default now(),
  unique (profile_id, role)
);


-- ============================================================================
-- SECTION 4: BUSINESS FUNCTIONS & SKILLS TAXONOMY
-- ============================================================================
create table business_functions (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  created_at        timestamptz not null default now(),
  unique (organization_id, name)
);

alter table profiles
  add constraint fk_profiles_business_function
  foreign key (business_function_id) references business_functions(id);

create table skills (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  category          text,                 -- e.g. 'Technology', 'Certification', 'Domain'
  created_at        timestamptz not null default now(),
  unique (organization_id, name)
);

create table profile_skills (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  skill_id          uuid not null references skills(id) on delete cascade,
  experience_years  numeric(4,1),
  last_used_on      date,                 -- feeds "recency" weighting in search ranking
  created_at        timestamptz not null default now(),
  unique (profile_id, skill_id)
);

create index idx_profile_skills_skill on profile_skills(skill_id);


-- ============================================================================
-- SECTION 5: PROJECTS
-- ============================================================================
create table projects (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  code                  text,
  client_name           text,
  business_function_id  uuid references business_functions(id),
  status                project_status not null default 'draft',
  planned_start_date    date,
  planned_end_date      date,
  source_poc_id         uuid,  -- fk added after pocs table exists; null if not POC-originated
  created_by            uuid not null references profiles(id),
  closed_at             timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_projects_org on projects(organization_id);
create index idx_projects_status on projects(organization_id, status);

-- Supports multiple PMs owning one project
create table project_owners (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (project_id, profile_id)
);

-- Open positions a PM defines during Staffing stage
create table project_role_requirements (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  title             text not null,
  headcount         integer not null default 1,
  required_skills   uuid[] default '{}',   -- array of skill ids
  status            text not null default 'open',  -- open | filled | cancelled
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now()
);


-- ============================================================================
-- SECTION 6: ALLOCATIONS
-- ============================================================================
create table allocations (
  id                        uuid primary key default uuid_generate_v4(),
  organization_id           uuid not null references organizations(id) on delete cascade,
  project_id                uuid not null references projects(id) on delete cascade,
  profile_id                uuid not null references profiles(id) on delete cascade,
  allocation_percent         numeric(5,2) not null check (allocation_percent > 0),
  status                    allocation_status not null default 'active',
  start_date                date not null,
  expected_completion_date  date,
  planned_release_date      date,
  actual_release_date       date,
  created_by                uuid not null references profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_allocations_org on allocations(organization_id);
create index idx_allocations_project on allocations(project_id);
create index idx_allocations_profile on allocations(profile_id, status);

-- Full audit trail — every change to an allocation is versioned, never overwritten silently
create table allocation_history (
  id              uuid primary key default uuid_generate_v4(),
  allocation_id   uuid not null references allocations(id) on delete cascade,
  changed_by      uuid not null references profiles(id),
  change_type     text not null,     -- created | percent_changed | status_changed | dates_changed
  before_state    jsonb,
  after_state     jsonb,
  created_at      timestamptz not null default now()
);


-- ============================================================================
-- SECTION 7: ALLOCATION / RESERVATION REQUESTS + APPROVALS
-- ============================================================================
create table allocation_requests (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  project_id            uuid not null references projects(id) on delete cascade,
  requested_profile_id  uuid references profiles(id),  -- null if requesting "anyone matching skill X"
  requirement_id        uuid references project_role_requirements(id),
  requested_by          uuid not null references profiles(id),
  request_type          request_type not null default 'hard_allocation',
  allocation_percent    numeric(5,2) not null,
  start_date            date not null,
  end_date              date,
  justification         text,
  status                request_status not null default 'pending',
  routed_to             uuid references profiles(id),   -- the RM/Tech Lead this is pending with
  decided_by            uuid references profiles(id),
  decided_at            timestamptz,
  decision_notes        text,
  created_at            timestamptz not null default now()
);

create index idx_requests_org on allocation_requests(organization_id);
create index idx_requests_status on allocation_requests(organization_id, status);
create index idx_requests_routed_to on allocation_requests(routed_to, status);

-- Flags overlapping requests on the same resource for RM arbitration
create table request_conflicts (
  id              uuid primary key default uuid_generate_v4(),
  request_id_a    uuid not null references allocation_requests(id) on delete cascade,
  request_id_b    uuid not null references allocation_requests(id) on delete cascade,
  detected_at     timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references profiles(id)
);

-- Generic audit trail for all approval/workflow actions (BRD §6.4: full approval audit trail)
create table audit_log (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id        uuid references profiles(id),
  action          text not null,          -- e.g. 'allocation_request.approved'
  entity_type     text not null,          -- e.g. 'allocation_request'
  entity_id       uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index idx_audit_log_org on audit_log(organization_id, created_at desc);


-- ============================================================================
-- SECTION 8: IDLE / UTILIZATION THRESHOLDS
-- ============================================================================
create table idle_thresholds (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  business_function_id  uuid references business_functions(id),  -- null = org-wide default
  threshold_percent     numeric(5,2) not null default 70,
  created_at            timestamptz not null default now(),
  unique (organization_id, business_function_id)
);


-- ============================================================================
-- SECTION 9: SALES POC & CONVERSION TRACKING
-- ============================================================================
create table pocs (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  client_name       text not null,
  opportunity_name  text,
  business_function_id uuid references business_functions(id),
  start_date        date,
  end_date          date,
  outcome           poc_outcome not null default 'pending',
  outcome_notes     text,
  converted_project_id uuid references projects(id),
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table projects
  add constraint fk_projects_source_poc
  foreign key (source_poc_id) references pocs(id);

create table poc_resources (
  id            uuid primary key default uuid_generate_v4(),
  poc_id        uuid not null references pocs(id) on delete cascade,
  profile_id    uuid not null references profiles(id),
  allocation_id uuid references allocations(id),   -- links effort back to real allocated bandwidth
  created_at    timestamptz not null default now(),
  unique (poc_id, profile_id)
);


-- ============================================================================
-- SECTION 10: NOTIFICATIONS
-- ============================================================================
create table notification_rules (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  role              user_role not null,
  event_type        text not null,
  lead_time_days    integer,
  channel           text not null default 'in_app_and_email',
  created_at        timestamptz not null default now()
);

create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  entity_type     text,
  entity_id       uuid,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_notifications_profile on notifications(profile_id, read_at);


-- ============================================================================
-- SECTION 11: BULK IMPORT (Excel/CSV)
-- ============================================================================
create table bulk_import_jobs (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  uploaded_by       uuid not null references profiles(id),
  file_name         text,
  total_rows        integer default 0,
  valid_rows        integer default 0,
  error_rows        integer default 0,
  status            import_job_status not null default 'processing',
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

alter table profiles
  add constraint fk_profiles_bulk_import_job
  foreign key (bulk_import_job_id) references bulk_import_jobs(id);

create table bulk_import_error_rows (
  id              uuid primary key default uuid_generate_v4(),
  job_id          uuid not null references bulk_import_jobs(id) on delete cascade,
  row_number      integer not null,
  raw_data        jsonb not null,
  error_reason    text not null,
  created_at      timestamptz not null default now()
);


-- ============================================================================
-- SECTION 12: HELPER FUNCTIONS (used throughout RLS policies)
-- ============================================================================

-- Returns the calling user's organization_id
create or replace function auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Returns the calling user's primary role
create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select primary_role from profiles where id = auth.uid();
$$;

-- Returns true if the calling user holds a given role (primary or additional)
create or replace function auth_has_role(check_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and primary_role = check_role
    union
    select 1 from user_roles where profile_id = auth.uid() and role = check_role
  );
$$;

-- Bootstraps a brand-new organization + its first Admin profile in one transaction.
-- Call this via RPC immediately after supabase.auth.signUp() on the signup screen.
create or replace function create_organization_and_admin(
  p_company_name text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name) values (p_company_name) returning id into v_org_id;

  insert into profiles (id, organization_id, full_name, email, primary_role, status, provisioning_source)
  values (
    auth.uid(),
    v_org_id,
    p_full_name,
    (select email from auth.users where id = auth.uid()),
    'admin',
    'active',
    'self_signup_admin'
  );

  return v_org_id;
end;
$$;

-- Enforces seat_limit before a new profile is inserted (individual add or bulk import row)
create or replace function check_seat_limit()
returns trigger
language plpgsql
as $$
declare
  v_seat_limit integer;
  v_current_count integer;
begin
  select seat_limit into v_seat_limit from organizations where id = new.organization_id;
  select count(*) into v_current_count from profiles where organization_id = new.organization_id;

  if v_current_count >= v_seat_limit then
    raise exception 'Seat limit reached for this organization (limit: %). Upgrade your plan to add more employees.', v_seat_limit;
  end if;

  return new;
end;
$$;

create trigger trg_check_seat_limit
  before insert on profiles
  for each row execute function check_seat_limit();

-- Generic updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();
create trigger trg_allocations_updated_at before update on allocations for each row execute function set_updated_at();
create trigger trg_pocs_updated_at before update on pocs for each row execute function set_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();


-- ============================================================================
-- SECTION 13: ROW LEVEL SECURITY
-- ============================================================================
-- Pattern used throughout: every tenant table is readable/writable only by
-- members of the same organization_id. Write access is further narrowed by
-- role where the BRD specifies it (e.g. only RM/Admin approve requests).

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table business_functions enable row level security;
alter table skills enable row level security;
alter table profile_skills enable row level security;
alter table projects enable row level security;
alter table project_owners enable row level security;
alter table project_role_requirements enable row level security;
alter table allocations enable row level security;
alter table allocation_history enable row level security;
alter table allocation_requests enable row level security;
alter table request_conflicts enable row level security;
alter table audit_log enable row level security;
alter table idle_thresholds enable row level security;
alter table pocs enable row level security;
alter table poc_resources enable row level security;
alter table notification_rules enable row level security;
alter table notifications enable row level security;
alter table bulk_import_jobs enable row level security;
alter table bulk_import_error_rows enable row level security;

-- organizations: a user can only see their own org record
create policy org_select on organizations for select
  using (id = auth_org_id());
create policy org_update_admin_only on organizations for update
  using (id = auth_org_id() and auth_has_role('admin'));

-- profiles: visible within the same org; only Admin can insert/update/deactivate others
create policy profiles_select on profiles for select
  using (organization_id = auth_org_id());
create policy profiles_insert_admin on profiles for insert
  with check (organization_id = auth_org_id() and auth_has_role('admin'));
create policy profiles_update_self_or_admin on profiles for update
  using (organization_id = auth_org_id() and (id = auth.uid() or auth_has_role('admin')));

-- business_functions / skills: org-scoped, Admin manages, everyone reads
create policy biz_func_select on business_functions for select using (organization_id = auth_org_id());
create policy biz_func_write_admin on business_functions for insert with check (organization_id = auth_org_id() and auth_has_role('admin'));
create policy skills_select on skills for select using (organization_id = auth_org_id());
create policy skills_write_admin on skills for insert with check (organization_id = auth_org_id() and auth_has_role('admin'));

-- profile_skills: user manages their own; anyone in org can read (needed for Expertise Search)
create policy profile_skills_select on profile_skills for select
  using (exists (select 1 from profiles p where p.id = profile_skills.profile_id and p.organization_id = auth_org_id()));
create policy profile_skills_write_self on profile_skills for insert
  with check (profile_id = auth.uid());
create policy profile_skills_update_self on profile_skills for update
  using (profile_id = auth.uid());

-- projects: org-scoped read; PM/Admin create; PM (owner) or Admin update
create policy projects_select on projects for select using (organization_id = auth_org_id());
create policy projects_insert on projects for insert
  with check (organization_id = auth_org_id() and (auth_has_role('admin') or auth_has_role('project_manager')));
create policy projects_update on projects for update
  using (
    organization_id = auth_org_id()
    and (
      auth_has_role('admin')
      or exists (select 1 from project_owners po where po.project_id = projects.id and po.profile_id = auth.uid())
    )
  );

-- allocations: org-scoped read; writes via requests/approvals flow (RM/Admin), PM can adjust their own project's allocations
create policy allocations_select on allocations for select using (organization_id = auth_org_id());
create policy allocations_write on allocations for all
  using (
    organization_id = auth_org_id()
    and (
      auth_has_role('admin') or auth_has_role('resource_manager')
      or exists (select 1 from project_owners po where po.project_id = allocations.project_id and po.profile_id = auth.uid())
    )
  );

-- allocation_requests: org-scoped read; any org member can insert (PM/Tech Lead raise them);
-- only the routed approver (RM) or Admin can update status
create policy requests_select on allocation_requests for select using (organization_id = auth_org_id());
create policy requests_insert on allocation_requests for insert
  with check (organization_id = auth_org_id());
create policy requests_update_approver on allocation_requests for update
  using (organization_id = auth_org_id() and (auth_has_role('admin') or auth_has_role('resource_manager') or routed_to = auth.uid()));

-- pocs: Sales Lead + Admin write, org reads
create policy pocs_select on pocs for select using (organization_id = auth_org_id());
create policy pocs_write on pocs for all
  using (organization_id = auth_org_id() and (auth_has_role('admin') or auth_has_role('sales_lead')));

-- notifications: strictly own-row only
create policy notifications_select_own on notifications for select using (profile_id = auth.uid());
create policy notifications_update_own on notifications for update using (profile_id = auth.uid());

-- bulk_import_jobs / error_rows: Admin only
create policy bulk_jobs_admin on bulk_import_jobs for all
  using (organization_id = auth_org_id() and auth_has_role('admin'));
create policy bulk_errors_admin on bulk_import_error_rows for select
  using (exists (select 1 from bulk_import_jobs j where j.id = bulk_import_error_rows.job_id and j.organization_id = auth_org_id() and auth_has_role('admin')));

-- audit_log: read-only for Admin/RM, system inserts via security-definer functions
create policy audit_log_select on audit_log for select
  using (organization_id = auth_org_id() and (auth_has_role('admin') or auth_has_role('resource_manager')));

-- idle_thresholds: RM/Admin manage, org reads
create policy idle_thresholds_select on idle_thresholds for select using (organization_id = auth_org_id());
create policy idle_thresholds_write on idle_thresholds for all
  using (organization_id = auth_org_id() and (auth_has_role('admin') or auth_has_role('resource_manager')));

-- NOTE: project_owners, project_role_requirements, allocation_history, request_conflicts,
-- poc_resources, notification_rules follow the same org-scoped-select pattern as above —
-- replicate `using (organization_id = auth_org_id())` (or join to parent table where the
-- child table has no organization_id column directly, as done for profile_skills above).


-- ============================================================================
-- NOTE: Billing/subscriptions intentionally excluded from this schema.
-- organizations.plan (enum) and organizations.seat_limit are kept as simple
-- fields so seat-limit enforcement (Section 12 trigger) still works without
-- payment infrastructure. When billing is added later, introduce `plans`
-- and `subscriptions` tables and wire `organizations.plan`/`seat_limit` to
-- update from Stripe webhooks instead of being manually set.
-- ============================================================================
