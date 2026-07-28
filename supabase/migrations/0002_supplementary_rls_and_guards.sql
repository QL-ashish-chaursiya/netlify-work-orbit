-- ============================================================================
-- Migration 0002: supplementary RLS policies + business-rule guards
-- Fills the gaps 0001_init.sql's own comments flag as TODO, plus enforces
-- BRD §7 edge cases that have no server-side enforcement in the base schema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Missing RLS policies (tables had RLS enabled but zero policies -> default
-- deny, which breaks the app). Pattern: org-scoped select for everyone in the
-- tenant; writes scoped to the role/ownership the BRD assigns to that action.
-- ----------------------------------------------------------------------------

-- project_owners: visible org-wide (needed for project cards); Admin or an
-- existing owner of the project can manage the owner list.
create policy project_owners_select on project_owners for select
  using (exists (select 1 from projects p where p.id = project_owners.project_id and p.organization_id = auth_org_id()));
create policy project_owners_write on project_owners for all
  using (
    exists (
      select 1 from projects p
      where p.id = project_owners.project_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or exists (
          select 1 from project_owners po2 where po2.project_id = p.id and po2.profile_id = auth.uid()
        ))
    )
  );

-- project_role_requirements: org-scoped select; PM (project owner) or Admin manages.
create policy role_requirements_select on project_role_requirements for select
  using (exists (select 1 from projects p where p.id = project_role_requirements.project_id and p.organization_id = auth_org_id()));
create policy role_requirements_write on project_role_requirements for all
  using (
    exists (
      select 1 from projects p
      where p.id = project_role_requirements.project_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or exists (
          select 1 from project_owners po where po.project_id = p.id and po.profile_id = auth.uid()
        ))
    )
  );

-- allocation_history: org-scoped select only; rows are written exclusively by
-- security-definer functions/triggers (service role), never directly by clients.
create policy allocation_history_select on allocation_history for select
  using (exists (select 1 from allocations a where a.id = allocation_history.allocation_id and a.organization_id = auth_org_id()));

-- request_conflicts: org-scoped select; RM/Admin resolve.
create policy request_conflicts_select on request_conflicts for select
  using (
    exists (
      select 1 from allocation_requests r
      where r.id = request_conflicts.request_id_a and r.organization_id = auth_org_id()
    )
  );
create policy request_conflicts_resolve on request_conflicts for update
  using (
    exists (
      select 1 from allocation_requests r
      where r.id = request_conflicts.request_id_a
        and r.organization_id = auth_org_id()
        and (auth_has_role('admin') or auth_has_role('resource_manager'))
    )
  );

-- poc_resources: follows pocs RLS (Sales Lead + Admin write, org reads).
create policy poc_resources_select on poc_resources for select
  using (exists (select 1 from pocs p where p.id = poc_resources.poc_id and p.organization_id = auth_org_id()));
create policy poc_resources_write on poc_resources for all
  using (
    exists (
      select 1 from pocs p
      where p.id = poc_resources.poc_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or auth_has_role('sales_lead'))
    )
  );

-- notification_rules: org-scoped select for everyone (UI needs to know cadence); Admin manages.
create policy notification_rules_select on notification_rules for select
  using (organization_id = auth_org_id());
create policy notification_rules_write on notification_rules for all
  using (organization_id = auth_org_id() and auth_has_role('admin'));

-- profile_skills: allow a user to remove their own skill (only insert/update existed).
create policy profile_skills_delete_self on profile_skills for delete
  using (profile_id = auth.uid());

-- notifications: system (service-role Edge Functions / security-definer
-- functions) needs to insert rows for other users; service role bypasses RLS
-- entirely so no policy is required for that path. No client-side insert policy
-- is added on purpose — notifications are never created directly by end users.

-- ----------------------------------------------------------------------------
-- Self-approval block: a user must never approve/reject their own request,
-- even if they hold the resource_manager role. Tighten the existing update
-- policy rather than relying on UI hiding alone.
-- ----------------------------------------------------------------------------
drop policy if exists requests_update_approver on allocation_requests;
create policy requests_update_approver on allocation_requests for update
  using (
    organization_id = auth_org_id()
    and requested_by <> auth.uid()
    and (auth_has_role('admin') or auth_has_role('resource_manager') or routed_to = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Block deactivating the last remaining Admin in an organization.
-- ----------------------------------------------------------------------------
create or replace function guard_last_admin()
returns trigger
language plpgsql
as $$
declare
  v_other_active_admins integer;
begin
  if new.status = 'deactivated' and old.status <> 'deactivated' and old.primary_role = 'admin' then
    select count(*) into v_other_active_admins
    from profiles
    where organization_id = old.organization_id
      and primary_role = 'admin'
      and status <> 'deactivated'
      and id <> old.id;

    if v_other_active_admins = 0 then
      raise exception 'Cannot deactivate the last remaining Admin for this organization.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_guard_last_admin
  before update on profiles
  for each row execute function guard_last_admin();

-- ----------------------------------------------------------------------------
-- Block closing a project while any allocation on it is still `active`.
-- Defense-in-depth alongside the UI-side block (BRD §5 Phase 3 / §7).
-- ----------------------------------------------------------------------------
create or replace function guard_project_close()
returns trigger
language plpgsql
as $$
declare
  v_active_count integer;
begin
  if new.status = 'closed' and old.status <> 'closed' then
    select count(*) into v_active_count
    from allocations
    where project_id = new.id
      and status = 'active';

    if v_active_count > 0 then
      raise exception 'Cannot close project while % allocation(s) are still active.', v_active_count;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_guard_project_close
  before update on projects
  for each row execute function guard_project_close();
