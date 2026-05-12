-- Licensed to Haul: audience specs (partner-facing config)
--
-- LtH-owned. Form-driven, no mags. Holds the partner's criteria,
-- exclusions, budget cap, and price per transfer for a given audience.
--
-- When matching carriers, LtH sends the criteria/exclusions JSON to
-- hq-x's HTTP audience-matcher (Phase 6). No shared DB row required.

CREATE TABLE lth.audience_specs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id            uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  criteria                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  exclusions                jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_cap_cents          bigint,
  price_per_transfer_cents  bigint,
  status                    text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','paused','archived')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audience_specs_partner_idx
  ON lth.audience_specs (partner_org_id, status, updated_at DESC);

-- updated_at autotouch
CREATE OR REPLACE FUNCTION lth.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audience_specs_touch_updated_at ON lth.audience_specs;
CREATE TRIGGER audience_specs_touch_updated_at
  BEFORE UPDATE ON lth.audience_specs
  FOR EACH ROW
  EXECUTE FUNCTION lth.touch_updated_at();

-- Backfill the existing transfers.audience_spec_id FK to point here now that the table exists.
ALTER TABLE lth.transfers
  ADD CONSTRAINT transfers_audience_spec_fk
  FOREIGN KEY (audience_spec_id) REFERENCES lth.audience_specs(id) ON DELETE SET NULL;
