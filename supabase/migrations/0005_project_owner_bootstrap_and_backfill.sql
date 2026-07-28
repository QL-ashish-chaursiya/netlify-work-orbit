-- ============================================================================
-- Migration 0005: close a chicken-and-egg gap in project_owners RLS, and
-- backfill ownership for any project left ownerless by it.
--
-- project_owners_write (fixed for recursion in 0004) still requires the
-- caller to ALREADY be an owner (or Admin) to insert ANY row into
-- project_owners for a project — including adding themselves for the first
-- time. If that first automatic insert (right after project creation) ever
-- fails for any reason, the project's creator is permanently locked out of
-- fixing it themselves, since inserting requires already being an owner.
--
-- Fix: split project_owners_write into USING (existing-row visibility, needs
-- ownership/admin as before) and a WITH CHECK that additionally allows a
-- project's creator to insert a row naming themselves, at any time — that's
-- always safe since created_by is immutable ground truth.
-- ============================================================================

drop policy if exists project_owners_write on project_owners;

create policy project_owners_write on project_owners for all
  using (
    exists (
      select 1 from projects p
      where p.id = project_owners.project_id
        and p.organization_id = auth_org_id()
        and (auth_has_role('admin') or is_project_owner(p.id))
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = project_owners.project_id
        and p.organization_id = auth_org_id()
        and (
          auth_has_role('admin')
          or is_project_owner(p.id)
          or (project_owners.profile_id = auth.uid() and p.created_by = auth.uid())
        )
    )
  );

-- Backfill: any project that currently has zero rows in project_owners
-- (because its creator's automatic add-as-owner insert failed under the old
-- recursive policy) gets its creator added as primary owner now.
insert into project_owners (project_id, profile_id, is_primary)
select p.id, p.created_by, true
from projects p
where not exists (select 1 from project_owners po where po.project_id = p.id)
on conflict (project_id, profile_id) do nothing;
