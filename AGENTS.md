# Project architecture

- Validate manual farm coordinates with the shared farmCoordinates schema before moving the Leaflet map; empty input must never coerce to zero.- Edge functions authenticate via supabase/functions/_shared/auth.ts: user calls use getRequestUser, scheduled/internal calls use isTrustedCaller (service key or x-cron-secret checked against public.internal_job_secrets). Why: every server function must verify its caller.
