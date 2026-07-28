-- ============================================================================
-- Migration 0004: fix infinite RLS recursion on project_owners.
--
-- 0002's project_owners_write policy checked "is the caller already an owner
-- of this project" by querying project_owners FROM WITHIN project_owners' own
-- policy. Postgres has to re-apply RLS to evaluate that inner query, which
-- re-triggers the same policy, forever — Postgres error 42P17 ("infinite
-- recursion detected in policy for relation \"project_owners\"").
--
-- Fix: move the "is owner" check into a SECURITY DEFINER helper function,
-- same pattern as auth_org_id()/auth_has_role() already use elsewhere in this
-- schema — a security definer function owned by the migration role bypasses
-- RLS on the tables it reads internally, so the self-reference no longer
-- re-triggers policy evaluation. Also swaps every other inline
-- "exists (select ... from project_owners ...)" policy (on projects,
-- allocations, project_role_requirements) over to the same helper, since
-- those were only safe by accident of project_owners_write being the sole
-- broken policy — this is the more robust fix, not just a patch.
-- ============================================================================

create or replace function is_project_owner(p_project_id uuid, p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from project_owners po
    where po.project_id = p_project_id and po.profile_id = p_profile_id
  );
$$;

-- project_owners: Admin or an existing owner manages the owner list.
drop policy if exists project_owners_write on project_owners;
create policy project_owners_write on project_owners for all
  using (
    exists (
      select 1 from projects p
      where p.id = project_owners.project_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or is_project_owner(p.id))
    )
  );

-- project_role_requirements: PM (project owner) or Admin manages.
drop policy if exists role_requirements_write on project_role_requirements;
create policy role_requirements_write on project_role_requirements for all
  using (
    exists (
      select 1 from projects p
      where p.id = project_role_requirements.project_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or is_project_owner(p.id))
    )
  );

-- projects: PM (owner) or Admin update.
drop policy if exists projects_update on projects;
create policy projects_update on projects for update
  using (
    organization_id = auth_org_id()
    and (auth_has_role('admin') or is_project_owner(id))
  );

-- allocations: org-scoped read already exists; writes via RM/Admin, or the
-- PM who owns the allocation's project.
drop policy if exists allocations_write on allocations;
create policy allocations_write on allocations for all
  using (
    organization_id = auth_org_id()
    and (auth_has_role('admin') or auth_has_role('resource_manager') or is_project_owner(project_id))
  );
