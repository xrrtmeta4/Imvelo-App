-- Payment lifecycle fields + webhook idempotency.
-- Safe to re-run (IF NOT EXISTS / conditional unique index).

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "provider_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "gateway" TEXT,
  ADD COLUMN IF NOT EXISTS "product_id" TEXT,
  ADD COLUMN IF NOT EXISTS "plan" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;

CREATE INDEX IF NOT EXISTS "payments_provider_reference_idx" ON "payments" ("provider_reference");

-- Idempotency: at most one webhook event per (provider, provider_event_id).
-- provider_event_id is NULL for events that carry no stable id, and the
-- partial index keeps those from blocking anything.
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_id_unique"
  ON "webhook_events" ("provider", "provider_event_id")
  WHERE "provider_event_id" IS NOT NULL;
