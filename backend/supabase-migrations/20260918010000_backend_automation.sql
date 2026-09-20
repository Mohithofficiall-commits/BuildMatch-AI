-- ============================================================
-- BUILDMATCH — DATABASE AUTOMATION LAYER
--
-- Additive migration that makes the backend self-maintaining:
--   1. Project progress is recalculated from milestone status
--      automatically whenever milestones change.
--   2. Status transitions auto-complete the project and stamp dates.
--   3. Homeowners receive a notification on key lifecycle events
--      (milestone completion, payments, requests, reviews,
--      verification, material orders).
--   4. updated_at maintenance on tables that have the column.
--
-- Nothing existing is dropped or replaced; all triggers are guarded
-- with DROP TRIGGER IF EXISTS so the migration is re-runnable.
-- ============================================================

-- ------------------------------------------------------------
-- 1. updated_at maintenance
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables with an existing updated_at column
DROP TRIGGER IF EXISTS trg_material_orders_updated_at ON material_orders;
CREATE TRIGGER trg_material_orders_updated_at
  BEFORE UPDATE ON material_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_professional_requests_updated_at ON professional_requests;
CREATE TRIGGER trg_professional_requests_updated_at
  BEFORE UPDATE ON professional_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 2. Project progress auto-sync from milestones
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_project_progress() RETURNS trigger AS $$
DECLARE
  v_project_id uuid;
  v_total int;
  v_completed int;
  v_in_progress int;
  v_progress int;
BEGIN
  -- OLD is unassigned on INSERT and NEW on DELETE — guard lazily.
  v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'completed'),
         count(*) FILTER (WHERE status = 'in_progress')
    INTO v_total, v_completed, v_in_progress
  FROM milestones WHERE project_id = v_project_id;

  IF v_total IS NULL OR v_total = 0 THEN
    v_progress := 0;
  ELSE
    -- completed counts fully; in-progress counts as half
    v_progress := round(
      (v_completed + v_in_progress * 0.5) * 100 / v_total
    );
  END IF;

  UPDATE projects
     SET progress = LEAST(v_progress, 100)
   WHERE id = v_project_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_milestones_sync_progress ON milestones;
CREATE TRIGGER trg_milestones_sync_progress
  AFTER INSERT OR UPDATE OR DELETE ON milestones
  FOR EACH ROW EXECUTE FUNCTION sync_project_progress();

-- ------------------------------------------------------------
-- 3. Project lifecycle automation
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_project_lifecycle() RETURNS trigger AS $$
BEGIN
  -- Auto-complete: when progress hits 100 and project is active,
  -- stamp completion date and flip status.
  IF NEW.progress >= 100 AND NEW.status = 'active' THEN
    NEW.status := 'completed';
    NEW.actual_completion := CURRENT_DATE;
  END IF;

  -- Clear actual_completion when a completed project reopens.
  IF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.actual_completion := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_lifecycle ON projects;
CREATE TRIGGER trg_projects_lifecycle
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION sync_project_lifecycle();

-- ------------------------------------------------------------
-- 4. Homeowner notifications on lifecycle events
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_homeowner() RETURNS trigger AS $$
DECLARE
  v_homeowner uuid;
  v_title text;
  v_body text;
  v_link text;
  -- OLD is unassigned on INSERT triggers — capture lazily.
  v_old_status text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  -- Resolve the homeowner for this event's project. Only project-scoped
  -- tables carry project_id; user-scoped ones (verification, orders)
  -- notify their target users directly and skip this lookup.
  IF TG_TABLE_NAME IN ('milestones', 'payments', 'professional_requests', 'reviews') THEN
    v_homeowner := (SELECT homeowner_id FROM projects WHERE id = NEW.project_id);
    IF v_homeowner IS NULL THEN
      RETURN NEW; -- nothing to notify
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'milestones' THEN
    IF NEW.status = 'completed' AND COALESCE(v_old_status, '') <> 'completed' THEN
      v_title := 'Milestone completed';
      v_body := format('"%s" was marked completed on your project.', NEW.name);
      v_link := '/app/projects';
    ELSIF NEW.status = 'delayed' AND COALESCE(v_old_status, '') <> 'delayed' THEN
      v_title := 'Milestone delayed';
      v_body := format('"%s" on your project has been flagged as delayed.', NEW.name);
      v_link := '/app/projects';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'payments' THEN
    IF NEW.status = 'paid' AND COALESCE(v_old_status, '') <> 'paid' THEN
      v_title := 'Payment recorded';
      v_body := format('Payment of ₹%s for "%s" was marked paid.', to_char(NEW.amount, 'FM999999999'), NEW.milestone_name);
      v_link := '/app/payments';
    ELSIF NEW.status = 'overdue' AND COALESCE(v_old_status, '') <> 'overdue' THEN
      v_title := 'Payment overdue';
      v_body := format('Payment of ₹%s for "%s" is overdue.', to_char(NEW.amount, 'FM999999999'), NEW.milestone_name);
      v_link := '/app/payments';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'professional_requests' THEN
    -- Notify the professional when a request arrives; homeowner on response.
    IF NEW.status = 'pending' AND v_old_status IS NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        NEW.professional_id, 'request', 'New work request',
        format('"%s" — a homeowner sent you a work request.', NEW.title),
        CASE NEW.professional_type
          WHEN 'engineer' THEN '/app/engineer/requests'
          WHEN 'plumber' THEN '/app/plumber/requests'
          WHEN 'electrician' THEN '/app/electrician/requests'
          WHEN 'material_shop' THEN '/app/material-shop/requests'
          ELSE '/app/dashboard'
        END
      );
      RETURN NEW;
    ELSIF NEW.status IN ('accepted', 'declined') AND COALESCE(v_old_status, '') <> NEW.status THEN
      v_title := CASE NEW.status WHEN 'accepted' THEN 'Request accepted' ELSE 'Request declined' END;
      v_body := format('Your request "%s" was %s.', NEW.title, NEW.status);
      v_link := '/app/projects';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'reviews' THEN
    v_title := 'New review received';
    v_body := format('%s left a %s★ review on your project.', NEW.homeowner_name, NEW.rating);
    -- Reviews target the engineer, not the project homeowner.
    INSERT INTO notifications (user_id, type, title, message, link)
      SELECT user_id, 'review', v_title, v_body, '/app/engineer'
      FROM engineers WHERE id = NEW.engineer_id;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'verification_requests' THEN
    IF NEW.status IN ('verified', 'rejected') AND COALESCE(v_old_status, '') = 'pending' THEN
      v_title := CASE NEW.status WHEN 'verified' THEN 'You are verified 🎉' ELSE 'Verification update' END;
      v_body := CASE NEW.status
        WHEN 'verified' THEN 'Your professional verification was approved.'
        ELSE format('Your verification was not approved.%s', CASE WHEN NEW.rejection_reason IS NOT NULL THEN format(' Reason: %s', NEW.rejection_reason) ELSE '' END)
      END;
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id, 'verification', v_title, v_body,
        CASE NEW.professional_type
          WHEN 'engineer' THEN '/app/engineer/verification'
          WHEN 'plumber' THEN '/app/plumber/verification'
          WHEN 'electrician' THEN '/app/electrician/verification'
          WHEN 'material_shop' THEN '/app/material-shop/verification'
          ELSE '/app/dashboard'
        END
      );
    END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'material_orders' THEN
    IF NEW.status IS DISTINCT FROM v_old_status THEN
      v_title := 'Order update';
      v_body := format('Material order #%s is now %s.', LEFT(NEW.id::text, 8), NEW.status);
      -- Buyer follows their order; the shop fulfils it from its portal.
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (NEW.buyer_id, 'order', v_title, v_body, '/app/projects');
      RETURN NEW;
    END IF;
    RETURN NEW;

  ELSE
    RETURN NEW;
  END IF;

  IF v_homeowner IS NOT NULL AND v_title IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (v_homeowner, lower(v_title), v_title, v_body, v_link);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_milestones ON milestones;
CREATE TRIGGER trg_notify_milestones
  AFTER INSERT OR UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();

DROP TRIGGER IF EXISTS trg_notify_payments ON payments;
CREATE TRIGGER trg_notify_payments
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();

DROP TRIGGER IF EXISTS trg_notify_requests ON professional_requests;
CREATE TRIGGER trg_notify_requests
  AFTER INSERT OR UPDATE ON professional_requests
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();

DROP TRIGGER IF EXISTS trg_notify_reviews ON reviews;
CREATE TRIGGER trg_notify_reviews
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();

DROP TRIGGER IF EXISTS trg_notify_verification ON verification_requests;
CREATE TRIGGER trg_notify_verification
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();

DROP TRIGGER IF EXISTS trg_notify_orders ON material_orders;
CREATE TRIGGER trg_notify_orders
  AFTER UPDATE ON material_orders
  FOR EACH ROW EXECUTE FUNCTION notify_homeowner();
