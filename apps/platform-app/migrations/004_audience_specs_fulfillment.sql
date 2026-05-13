-- Audience specs: shift from monthly-spend model to fixed-count + fulfillment-window.
-- transfer_count_target: how many qualified transfers the partner has agreed to receive
-- fulfillment_window_days: how many days the platform has to deliver that count
-- Existing budget_cap_cents stays — derived field: transfer_count_target × price_per_transfer_cents

ALTER TABLE audience_specs
  ADD COLUMN IF NOT EXISTS transfer_count_target   integer,
  ADD COLUMN IF NOT EXISTS fulfillment_window_days integer;

COMMENT ON COLUMN audience_specs.transfer_count_target IS
  'Total qualified transfers this spec is contracted to deliver.';
COMMENT ON COLUMN audience_specs.fulfillment_window_days IS
  'Days the platform has to deliver transfer_count_target. Unfilled at expiration refunds or rolls forward.';
