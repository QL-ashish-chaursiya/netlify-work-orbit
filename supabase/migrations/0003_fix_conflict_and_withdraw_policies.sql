-- ============================================================================
-- Migration 0003: fix two RLS gaps found while building the Allocations
-- feature module against 0002's policies.
-- ============================================================================

-- request_conflicts had SELECT + an RM/Admin-only UPDATE (resolve) policy, but
-- no INSERT policy at all -- with RLS enabled, that means the client-side
-- conflict-detection flow (insert a linking row when two pending requests
-- overlap on the same resource) was silently denied. Anyone who can see both
-- sides of the conflict (i.e. both requests are in their org) may link them.
create policy request_conflicts_insert on request_conflicts for insert
  with check (
    exists (
      select 1 from allocation_requests r
      where r.id = request_conflicts.request_id_a and r.organization_id = auth_org_id()
    )
    and exists (
      select 1 from allocation_requests r
      where r.id = request_conflicts.request_id_b and r.organization_id = auth_org_id()
    )
  );

-- requests_update_approver (tightened in 0002 to block self-approval) only
-- lets admin/RM/routed_to touch a request -- which also accidentally blocked
-- the requester from withdrawing their OWN still-pending request. Withdraw
-- isn't an approval decision, so it's fine for the requester to do it
-- themselves; scope it tightly to their own row while still pending.
drop policy if exists requests_update_approver on allocation_requests;
create policy requests_update_approver on allocation_requests for update
  using (
    organization_id = auth_org_id()
    and (
      (requested_by = auth.uid() and status = 'pending')
      or (
        requested_by <> auth.uid()
        and (auth_has_role('admin') or auth_has_role('resource_manager') or routed_to = auth.uid())
      )
    )
  );
