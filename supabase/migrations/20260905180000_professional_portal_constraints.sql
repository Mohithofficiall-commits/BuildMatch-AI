/*
# BuildMatch AI — Professional Portal Constraints

## Summary
Small additive migration supporting the new professional portals
(material shop, plumber, electrician) and homeowner → professional
connect flow. It does NOT modify or drop any existing table/data.

## Changes
1. `project_members` — unique index on (project_id, user_id) so a
   professional can only join a project once, even if a homeowner sends
   multiple requests and several are accepted.
2. `project_members` — index on user_id for "my projects" lookups.
3. `professional_requests` — index on status for accept/decline filters.
4. `material_orders` — index on (shop_id, status) for order tracking and
   earnings rollups.

## Access control note
All tables keep the project's existing prototype RLS posture (open
anon + authenticated CRUD, matching the pre-existing migrations). The
application layer enforces access:
- role-gated routes for each portal,
- every query/mutation is scoped by the signed-in user id
  (professional_id / user_id / shop_id / buyer_id),
- homeowner write actions are limited to projects they own,
- admin approval updates both the verification_request row and the
  matching profile row.
Tightening RLS to owner-only policies would require the app to move off
the anon key onto authenticated Supabase sessions; that is a larger
auth migration and would break the existing prototype flows.
*/

-- project_members: one membership per (project, user)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_project_user ON project_members (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members (user_id);

-- professional_requests: fast status filtering
CREATE INDEX IF NOT EXISTS idx_professional_requests_status ON professional_requests (status);

-- material_orders: fast shop order tracking / earnings rollups
CREATE INDEX IF NOT EXISTS idx_material_orders_shop_status ON material_orders (shop_id, status);
