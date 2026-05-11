# licensedtohaul

The carrier-facing dashboard for **licensedtohaul.com** — extracted from the `hq-all` monorepo into its own repo.

For licensed motor carriers: live FMCSA profile, freight, insurance, financing, fuel cards, equipment, compliance.

## Stack

- Next.js 15 (App Router, standalone output)
- React 19 + Tailwind 4 (beta)
- Zod for form validation
- Cream/orange theme · Fraunces serif display + Inter body + JetBrains Mono labels
- Server actions for form submissions; configurable webhook delivery

## Surfaces

- **Public site:** `/`, `/claim`, `/opportunities` + 6 categories, `/about`, `/contact`, `/resources`
- **Carrier dashboard** (`/dashboard/[dot]`): Overview · Authority profile · Compliance · Safety · Fleet · Freight · Insurance · Financing · Fuel cards · Equipment · Inbox · Settings
- **Partner dashboard** (`/partner/[slug]`): Overview · Transfer inbox · Pipeline · Locked spec · Audience browser · Reports · Team · Billing & agreement

Both dashboards share a collapsible left sidebar (⌘B toggle, persisted to localStorage).

## Develop

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Environment

Doppler project: `hq-licensed-to-haul`, config `prd`.

| Variable | Purpose |
|---|---|
| `APPLICATIONS_WEBHOOK_URL` | POST endpoint for all form submissions (claim, contact). Slack incoming hook, Zapier, n8n, or any URL that accepts the JSON shape `{kind, receivedAt, source, data}`. Falls back to stdout logging if unset. |
| `EMAIL_INTENT_WEBHOOK_URL` | POST endpoint for stub dashboard-recap emails. Falls back to stdout logging if unset. Swap `lib/email.ts` to call Resend / Postmark / Loops when ready. |

## Deploy

Railway service, Dockerfile-based build at repo root. `DOPPLER_TOKEN` must be set as a build + runtime env var.
