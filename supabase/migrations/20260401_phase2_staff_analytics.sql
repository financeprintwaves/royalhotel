-- Phase 2: Staff Analytics Support
-- Add materialized view for staff performance metrics

CREATE MATERIALIZED VIEW IF NOT EXISTS staff_performance_metrics AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.branch_id,
  COUNT(o.id) FILTER (WHERE o.status = 'completed') AS completed_orders,
  COUNT(o.id) FILTER (WHERE o.status IN ('pending', 'in_progress', 'on_hold')) AS open_orders,
  SUM(o.total_amount) FILTER (WHERE o.status = 'completed') AS revenue_generated,
  AVG(EXTRACT(EPOCH FROM (o.closed_at - o.created_at))) FILTER (WHERE o.status = 'completed' AND o.closed_at IS NOT NULL) AS avg_order_completion_time,
  SUM(CASE WHEN o.is_discounted THEN 1 ELSE 0 END) FILTER (WHERE o.status = 'completed') AS discount_orders
FROM staff s
LEFT JOIN orders o ON o.served_by_staff_id = s.id
GROUP BY s.id;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_staff_performance_metrics() RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY staff_performance_metrics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger each order insert/update/delete
CREATE TRIGGER staff_performance_orders_update
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_staff_performance_metrics();
