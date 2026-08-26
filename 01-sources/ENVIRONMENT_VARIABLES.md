# Environment Variables Specification

**Project:** Ahan Asa (`ahanassa.com`)  
**Status:** Implementation contract  
**Primary stack:** Next.js App Router · TypeScript · Vercel · Cloudflare  
**Launch locale:** Persian (`fa-IR`) · RTL  
**Last updated:** 2026-08-25

---

## 1. Purpose

This document defines how Ahan Asa declares, stores, validates, exposes, and rotates environment variables.

The objectives are to:

- keep secrets out of source control and browser bundles;
- prevent Preview deployments from sending real leads or notifications;
- make Local, Preview, and Production behavior explicit;
- provide a single source of truth for the canonical site origin;
- fail deployments early when required configuration is missing or invalid;
- keep integrations replaceable through server-side adapters;
- give Claude Code an exact contract for adding or changing configuration.

This file defines configuration policy. It must be read together with:

- `SECURITY_GUIDELINES.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `API_INTEGRATIONS.md`
- `FORM_ARCHITECTURE.md`
- `ANALYTICS_TRACKING.md`
- `TECHNICAL_ARCHITECTURE.md`

---

## 2. Non-negotiable rules

1. **Never commit secrets.** Real tokens, passwords, private keys, webhook secrets, connection strings, and production recipient addresses must never appear in Git, Markdown files, screenshots, test fixtures, or issue descriptions.
2. **Only `NEXT_PUBLIC_*` variables may enter the browser bundle.** A variable with this prefix is public even when stored in a protected deployment dashboard.
3. **Do not place confidential data in public variables.** CRM credentials, email API keys, storage credentials, anti-bot secrets, signing keys, and private endpoints are server-only.
4. **Preview must be isolated from Production.** Preview deployments must use test credentials, test storage, test CRM destinations, and non-production recipients—or keep the integration disabled.
5. **Local development uses test credentials only.** Production credentials must never be copied to `.env.local`.
6. **Production configuration is managed outside the repository.** Use the approved deployment platform's encrypted environment-variable store.
7. **All variables are validated at startup/build time.** Missing, malformed, or contradictory configuration must stop the build or server initialization.
8. **The browser calls only Ahan Asa-controlled endpoints.** Third-party CRM, email, and storage calls are performed by server-side adapters.
9. **Feature flags do not provide security.** Authorization, origin validation, rate limiting, and server-side validation remain mandatory even when a feature is hidden in the UI.
10. **Environment variables hold deployment-specific configuration—not normal product content.** Brand copy, navigation, locale strings, file-type allowlists, and design values belong in typed source configuration or the CMS.

---

## 3. Environment model

| Environment | `APP_ENV` | Purpose | Credentials | Lead destination | Indexing |
| --- | --- | --- | --- | --- | --- |
| Local | `local` | Developer machine | Mock or dedicated test only | Local/mock/test inbox | Not public |
| Preview | `preview` | Pull request and stakeholder QA | Dedicated test only | Isolated test CRM/inbox/bucket | `noindex, nofollow` |
| Production | `production` | Public website | Approved production credentials | Approved production systems | Indexable |

### 3.1 Environment invariants

- `APP_ENV=production` requires `SITE_URL=https://ahanassa.com` unless the canonical hostname is deliberately changed through an approved architecture decision.
- `APP_ENV=preview` must never use a production CRM database, production notification recipient, or production upload bucket.
- `APP_ENV=local` must not send external notifications unless a developer explicitly enables an approved test provider.
- Preview pages must be protected where appropriate and must emit `noindex, nofollow` independently of any environment variable exposed to the browser.
- `NODE_ENV` is controlled by the framework/runtime. Application behavior must use `APP_ENV`, not overload `NODE_ENV`.

---

## 4. Naming convention

Use uppercase `SCREAMING_SNAKE_CASE`.

| Pattern | Meaning | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_*` | Intentionally public, embedded in browser JavaScript | `NEXT_PUBLIC_GTM_ID` |
| `*_URL` | Absolute URL with protocol | `SITE_URL` |
| `*_HOSTS` / `*_ORIGINS` | Comma-separated allowlist | `ALLOWED_HOSTS` |
| `*_TOKEN`, `*_SECRET`, `*_KEY` | Sensitive server-only credential unless explicitly documented as public | `CRM_API_TOKEN` |
| `*_ENABLED` | Boolean serialized as `true` or `false` | `CRM_ENABLED` |
| `*_TIMEOUT_MS` | Integer duration in milliseconds | `CRM_TIMEOUT_MS` |
| `*_MAX_BYTES` | Integer byte limit | `UPLOAD_MAX_BYTES` |

Do not use vague names such as `API_KEY`, `URL`, `PASSWORD`, or `TOKEN` without a service/domain prefix.

---

## 5. Authoritative variable registry

### 5.1 Core application variables

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Server | Always | `preview` | Enum: `local`, `preview`, `production` |
| `SITE_URL` | Server | Always | `https://ahanassa.com` | Absolute HTTPS URL in Production; no trailing slash |
| `ALLOWED_HOSTS` | Server | Preview/Production | `ahanassa.com,www.ahanassa.com` | Exact comma-separated hostnames; no protocol or wildcard |
| `TRUSTED_ORIGINS` | Server | Form/API enabled | `https://ahanassa.com` | Exact comma-separated origins used for sensitive POST checks |
| `LOG_LEVEL` | Server | Optional | `info` | Enum: `debug`, `info`, `warn`, `error`; Production default `info` |
| `BUILD_ID` | Server | Optional | Git commit SHA | Used for diagnostics; never contains secrets or user data |

`SITE_URL` is the only canonical-origin source for metadata, canonical URLs, Open Graph URLs, sitemap URLs, robots rules, and server-generated absolute links. Do not infer the Production canonical URL from request headers or `VERCEL_URL`.

### 5.2 Public analytics and consent variables

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_GTM_ID` | Public | When GTM enabled | `GTM-XXXXXXX` | Must match `^GTM-[A-Z0-9]+$` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Public | Optional | `false` | Enables client loading only; default `false` outside Production |
| `NEXT_PUBLIC_CONSENT_MODE` | Public | Optional | `required` | Enum: `required`, `disabled`; default `required` |

Rules:

- Prefer GTM as the single client-side analytics entry point.
- Do not expose server-side analytics secrets with `NEXT_PUBLIC_*`.
- Analytics must not receive inquiry text, phone numbers, email addresses, uploaded filenames, document contents, or other personal/commercial data.
- Preview analytics is disabled by default. If enabled for QA, it must use a separate test property/container.

### 5.3 Inquiry and CRM variables

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `CRM_ENABLED` | Server | Always | `false` | Default `false`; Production activation requires approval |
| `CRM_PROVIDER` | Server | When enabled | `odoo` | Enum defined by implemented adapters, e.g. `odoo`, `custom` |
| `CRM_BASE_URL` | Server | When enabled | `https://crm.example.com` | Absolute HTTPS URL; never expose to the browser |
| `CRM_DATABASE` | Server | Provider-specific | `ahanasa_prod` | Confidential identifier; separate per environment |
| `CRM_API_TOKEN` | Secret | When enabled | `<secret>` | Dedicated least-privilege service credential |
| `CRM_TIMEOUT_MS` | Server | Optional | `8000` | Integer; recommended range `1000–15000` |
| `CRM_TEST_MODE` | Server | Preview/Local when enabled | `true` | Must be `false` only in approved Production configuration |
| `CRM_TEST_TAG` | Server | Preview/Local | `preview` | Added to non-production records for unmistakable identification |

If the chosen CRM requires a username/password or client credentials instead of a token, introduce provider-specific names such as `ODOO_USERNAME` and `ODOO_API_KEY`. Do not repurpose unrelated variables.

Form submission must remain recoverable when the CRM is unavailable. The server endpoint should return a controlled response, log a non-sensitive correlation ID, and use the approved fallback defined in `FORM_ARCHITECTURE.md`; it must not leak provider errors to the browser.

### 5.4 Email notification variables

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `EMAIL_NOTIFICATIONS_ENABLED` | Server | Always | `false` | Default `false` outside Production |
| `EMAIL_PROVIDER` | Server | When enabled | `resend` | Must match an implemented adapter |
| `EMAIL_API_KEY` | Secret | When enabled | `<secret>` | Dedicated credential with minimum required permissions |
| `EMAIL_FROM` | Server | When enabled | `Ahan Asa Website <website@ahanassa.com>` | Must use an authenticated domain |
| `EMAIL_TO` | Sensitive server config | When enabled | `<approved-recipient>` | Comma-separated allowlisted recipients; never client-visible |
| `EMAIL_REPLY_TO` | Server | Optional | `info@ahanassa.com` | Static approved address; do not set directly from user input |

The submitter's email may be placed in message content only after validation. Never use untrusted form input as the SMTP/API `from` address or an unrestricted header value.

### 5.5 Upload and object-storage variables

Ahan Asa inquiry flows may accept an invoice, material list, or procurement document. Uploads are confidential and must not enter static assets or a public bucket.

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `UPLOADS_ENABLED` | Server | Always | `false` | Default `false` until secure storage is configured |
| `UPLOAD_MAX_BYTES` | Server | When enabled | `10485760` | Positive integer; server enforces the same or stricter limit |
| `STORAGE_PROVIDER` | Server | When enabled | `s3-compatible` | Must match an implemented adapter |
| `STORAGE_ENDPOINT` | Server | Provider-specific | `https://storage.example.com` | HTTPS endpoint; never browser-exposed |
| `STORAGE_REGION` | Server | Provider-specific | `eu-central-1` | Provider region identifier |
| `STORAGE_BUCKET` | Sensitive server config | When enabled | `ahanasa-inquiries-prod` | Private bucket; unique per environment |
| `STORAGE_ACCESS_KEY_ID` | Secret | When enabled | `<secret>` | Least-privilege service account |
| `STORAGE_SECRET_ACCESS_KEY` | Secret | When enabled | `<secret>` | Rotate according to Section 12 |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | Server | Optional | `300` | Short-lived access; recommended `60–900` |

The allowed MIME types and extensions belong in reviewed source configuration, not a mutable environment variable. Every upload requires server-side type, extension, size, and content validation; randomized object names; private access; and an explicit retention policy.

### 5.6 Anti-abuse variables

| Variable | Exposure | Required | Example | Rule |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | When Turnstile enabled | `<public-site-key>` | Public by design |
| `TURNSTILE_SECRET_KEY` | Secret | When Turnstile enabled | `<secret>` | Server verification only |
| `TURNSTILE_ENABLED` | Server | Always | `false` | Production forms should enable after keys are configured |
| `TURNSTILE_EXPECTED_HOSTNAMES` | Server | When enabled | `ahanassa.com,www.ahanassa.com` | Exact comma-separated hostnames |
| `RATE_LIMIT_PROVIDER` | Server | Optional | `upstash` | Omit only when edge/server protection is provided elsewhere and documented |
| `RATE_LIMIT_REDIS_URL` | Secret | Provider-specific | `<secret-url>` | Server-only connection URL |
| `RATE_LIMIT_REDIS_TOKEN` | Secret | Provider-specific | `<secret>` | Least-privilege token |

Cloudflare WAF and rate limiting complement application controls; they do not replace server-side input validation, origin checks, or abuse controls.

### 5.7 Signing, webhook, and scheduled-task variables

Define these only when the related feature exists.

| Variable | Exposure | Required | Rule |
| --- | --- | --- | --- |
| `WEBHOOK_SIGNING_SECRET` | Secret | For inbound/outbound signed webhooks | Minimum 32 random bytes; unique per environment |
| `CRON_SECRET` | Secret | For protected scheduled endpoints | Minimum 32 random bytes; never passed in a query string when headers are supported |
| `INQUIRY_REFERENCE_HMAC_KEY` | Secret | When generating non-guessable inquiry references | Minimum 32 random bytes; separate from webhook/cron secrets |

Never reuse one secret for multiple purposes.

### 5.8 Platform-provided variables

Vercel may inject variables such as `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, and commit metadata. They may be used for diagnostics or safe defaults, but:

- do not manually redefine them;
- do not use `VERCEL_URL` as the Production canonical origin;
- do not use platform variables as authorization evidence;
- do not make security-critical decisions solely from branch names;
- wrap any platform-specific access in the central environment module.

Cloudflare API tokens, zone IDs, and account IDs are deployment-automation credentials—not website runtime variables. Add them only to the relevant CI environment when automation explicitly requires them, using least-privilege tokens.

---

## 6. Conditional requirements

Configuration validation must enforce these dependencies:

| Condition | Required variables / behavior |
| --- | --- |
| `CRM_ENABLED=true` | `CRM_PROVIDER`, `CRM_BASE_URL`, provider credential, timeout validation |
| `EMAIL_NOTIFICATIONS_ENABLED=true` | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` |
| `UPLOADS_ENABLED=true` | Storage provider configuration, private bucket, upload size limit |
| `TURNSTILE_ENABLED=true` | Public site key, secret key, expected hostnames |
| `NEXT_PUBLIC_ANALYTICS_ENABLED=true` | Valid `NEXT_PUBLIC_GTM_ID`; Production consent behavior configured |
| `APP_ENV=preview` | Production destinations forbidden; analytics off or test-only; `CRM_TEST_MODE=true` if CRM is enabled |
| `APP_ENV=production` | `SITE_URL=https://ahanassa.com`; HTTPS trusted origins; approved host allowlist |

The validation layer must reject a state where a feature is enabled but any required dependent variable is missing.

---

## 7. Repository files and Git policy

| File | Commit? | Purpose |
| --- | --- | --- |
| `.env.example` | Yes | Complete key inventory with safe placeholders and comments |
| `.env.local` | No | Developer-specific test values |
| `.env.test` | Yes, only if secret-free | Deterministic automated-test defaults |
| `.env.production` | No | Do not use as a production secret store |
| `lib/env/server.ts` | Yes | Server-only parsing and validation |
| `lib/env/client.ts` | Yes | Explicit public-variable parsing only |

Required `.gitignore` rules:

```gitignore
.env
.env.*
!.env.example
!.env.test
```

Before each commit and deployment, scan the repository for accidental secrets. If a real credential was committed, deleting it from the current file is insufficient: revoke/rotate it immediately and follow the incident process in `SECURITY_GUIDELINES.md`.

---

## 8. Canonical `.env.example`

The repository must contain a secret-free `.env.example` based on this template. Empty values are intentional placeholders, not operational defaults.

```dotenv
# -----------------------------------------------------------------------------
# Core
# -----------------------------------------------------------------------------
APP_ENV=local
SITE_URL=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
TRUSTED_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
BUILD_ID=

# -----------------------------------------------------------------------------
# Analytics — public values
# -----------------------------------------------------------------------------
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_CONSENT_MODE=required

# -----------------------------------------------------------------------------
# CRM / inquiry routing — server only
# -----------------------------------------------------------------------------
CRM_ENABLED=false
CRM_PROVIDER=
CRM_BASE_URL=
CRM_DATABASE=
CRM_API_TOKEN=
CRM_TIMEOUT_MS=8000
CRM_TEST_MODE=true
CRM_TEST_TAG=local

# -----------------------------------------------------------------------------
# Email notifications — server only
# -----------------------------------------------------------------------------
EMAIL_NOTIFICATIONS_ENABLED=false
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
EMAIL_TO=
EMAIL_REPLY_TO=

# -----------------------------------------------------------------------------
# Confidential uploads — server only
# -----------------------------------------------------------------------------
UPLOADS_ENABLED=false
UPLOAD_MAX_BYTES=10485760
STORAGE_PROVIDER=
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_SIGNED_URL_TTL_SECONDS=300

# -----------------------------------------------------------------------------
# Anti-abuse
# -----------------------------------------------------------------------------
TURNSTILE_ENABLED=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_EXPECTED_HOSTNAMES=localhost
RATE_LIMIT_PROVIDER=
RATE_LIMIT_REDIS_URL=
RATE_LIMIT_REDIS_TOKEN=

# -----------------------------------------------------------------------------
# Optional protected endpoints
# -----------------------------------------------------------------------------
WEBHOOK_SIGNING_SECRET=
CRON_SECRET=
INQUIRY_REFERENCE_HMAC_KEY=
```

Do not add real-looking example secrets. Use empty values or explicit placeholders such as `<secret>` only in documentation.

---

## 9. Central validation module

All access to `process.env` must be centralized. Application components, route handlers, and integration adapters import typed configuration instead of reading arbitrary keys directly.

Recommended structure:

```text
lib/
└── env/
    ├── client.ts
    └── server.ts
```

### 9.1 Server example

```ts
// lib/env/server.ts
import "server-only";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const serverSchema = z
  .object({
    APP_ENV: z.enum(["local", "preview", "production"]),
    SITE_URL: z.string().url().transform((value) => value.replace(/\/$/, "")),
    ALLOWED_HOSTS: z.string().min(1),
    TRUSTED_ORIGINS: z.string().min(1),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    CRM_ENABLED: booleanString.default("false"),
    CRM_PROVIDER: z.string().optional(),
    CRM_BASE_URL: z.string().url().optional(),
    CRM_API_TOKEN: z.string().min(20).optional(),
    CRM_TEST_MODE: booleanString.default("true"),

    EMAIL_NOTIFICATIONS_ENABLED: booleanString.default("false"),
    EMAIL_PROVIDER: z.string().optional(),
    EMAIL_API_KEY: z.string().min(20).optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_TO: z.string().optional(),

    UPLOADS_ENABLED: booleanString.default("false"),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.SITE_URL !== "https://ahanassa.com") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SITE_URL"],
        message: "Production SITE_URL must be https://ahanassa.com",
      });
    }

    if (env.APP_ENV === "preview" && env.CRM_ENABLED && !env.CRM_TEST_MODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRM_TEST_MODE"],
        message: "Preview CRM integrations must run in test mode",
      });
    }

    if (env.CRM_ENABLED && (!env.CRM_PROVIDER || !env.CRM_BASE_URL || !env.CRM_API_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRM_ENABLED"],
        message: "Enabled CRM requires provider, base URL, and API token",
      });
    }
  });

export const serverEnv = serverSchema.parse(process.env);
```

The implementation must extend the cross-field validation to cover every enabled adapter. The sample is illustrative and does not replace full tests.

### 9.2 Client example

Next.js replaces public variables statically. Reference each public key explicitly; do not dynamically index `process.env`.

```ts
// lib/env/client.ts
import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_GTM_ID: z.string().regex(/^GTM-[A-Z0-9]+$/).optional().or(z.literal("")),
  NEXT_PUBLIC_CONSENT_MODE: z.enum(["required", "disabled"]).default("required"),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  NEXT_PUBLIC_CONSENT_MODE: process.env.NEXT_PUBLIC_CONSENT_MODE,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
```

### 9.3 Import boundary

- `server.ts` must import `server-only`.
- Client Components may import only `client.ts`.
- Shared UI modules must not import server configuration.
- Route Handlers, Server Actions, and server adapters may import `server.ts`.
- Logging must report missing key names, never secret values.

---

## 10. Vercel configuration matrix

Each variable must be assigned only to the environments that need it.

| Variable group | Development | Preview | Production |
| --- | --- | --- | --- |
| Core origin/host | Local values | Preview-safe values | Canonical Production values |
| Analytics | Disabled | Disabled or test container | Approved Production container |
| CRM | Mock/test | Test database or disabled | Production database |
| Email | Local sink/disabled | Test recipient/disabled | Approved recipients |
| Storage | Local/test | Dedicated private test bucket | Dedicated private Production bucket |
| Turnstile | Test keys/disabled | Preview/test hostname keys | Production hostname keys |
| Rate limiting | Local fallback | Test namespace | Production namespace |

Rules:

- Variables scoped to Preview must not be copied automatically to Production.
- Sensitive Production changes require an authorized operator and a deployment record.
- After changing a build-time `NEXT_PUBLIC_*` variable, redeploy; already-built assets retain the old value.
- Preview deployments from untrusted contributions must not receive sensitive variables.
- Do not print environment values in build logs to diagnose configuration.

---

## 11. Cloudflare boundary

Cloudflare owns DNS, TLS edge termination, redirects, WAF, bot controls, and selected rate limits. Application environment variables own runtime configuration.

The website must:

- trust only the intended hostnames;
- use HTTPS canonical URLs;
- validate `Origin`/`Host` on sensitive endpoints;
- avoid trusting spoofable forwarding headers without platform guarantees;
- never expose Cloudflare API credentials to the Next.js runtime unless an approved runtime feature genuinely requires them.

Cloudflare secrets used by CI/CD must be scoped to the exact zone and action required. They belong in the CI secret store, not `.env.example` unless deployment automation is part of this repository and the key names are documented without values.

---

## 12. Secret lifecycle

### 12.1 Creation

- Generate secrets with a cryptographically secure generator.
- Use separate secrets for Local/test, Preview, and Production.
- Use separate credentials for separate services and purposes.
- Grant only the minimum required scopes.

### 12.2 Rotation

Rotate a secret:

- immediately after suspected disclosure;
- immediately if committed to Git, even if later removed;
- when an operator or vendor with access is removed;
- when required by provider policy;
- on the scheduled security-review cadence defined by `SECURITY_GUIDELINES.md`.

Where a provider supports overlap, add the new credential, deploy and verify, then revoke the old credential. Record the change without recording the secret value.

### 12.3 Revocation and incident handling

1. Disable or revoke the exposed credential.
2. Issue a replacement with minimum scope.
3. Update the affected deployment environments.
4. Redeploy and verify the integration.
5. Review access and provider logs.
6. Remove exposed material from reachable artifacts/history as appropriate.
7. Document the incident and corrective action without copying the secret.

---

## 13. Logging and privacy

Never log:

- the full environment object;
- authentication headers or provider responses containing credentials;
- inquiry descriptions, phone numbers, email addresses, invoice data, or uploaded document contents;
- signed URLs;
- storage object paths when they expose customer information;
- raw third-party errors returned to the browser.

Permitted diagnostic fields include:

- `APP_ENV`;
- build/commit identifier;
- adapter name;
- non-sensitive status code/category;
- elapsed time;
- generated correlation ID;
- configuration key name that failed validation, without its value.

---

## 14. Testing requirements

Automated tests must cover:

1. missing required core variables;
2. malformed `SITE_URL`, hostnames, origins, booleans, and integers;
3. Production with a non-canonical or non-HTTPS `SITE_URL`;
4. enabled adapter with missing dependent secrets;
5. Preview configured with Production-like destinations or `CRM_TEST_MODE=false`;
6. server variables being unreachable from client bundles;
7. analytics remaining disabled in Preview by default;
8. redaction of secrets and personal/commercial inquiry data from logs;
9. controlled provider timeout and error handling;
10. build failure on invalid configuration.

CI tests use deterministic fake values. They must never require or contact Production providers.

---

## 15. Claude Code operating rules

When Claude Code adds or changes an environment variable, it must:

1. explain why deployment-specific configuration is necessary;
2. classify the value as public, server-only, sensitive configuration, or secret;
3. choose a specific name following Section 4;
4. add the key without a real value to `.env.example`;
5. add typed validation to the correct central module;
6. add conditional validation for enabled integrations;
7. update this registry and any affected architecture document;
8. add or update automated tests;
9. confirm that no server-only value enters client code or static output;
10. state which Vercel environments require the key;
11. avoid changing deployment values directly unless the task explicitly authorizes it;
12. never print, copy, invent, or commit a real credential.

Claude Code must not:

- introduce a `NEXT_PUBLIC_*` variable merely to make server configuration easier to access;
- access `process.env` throughout arbitrary components;
- silently default a missing Production secret to an insecure value;
- make Preview send real inquiries or notifications;
- use environment variables for ordinary page content or styling;
- rename or delete an existing key without a migration plan.

---

## 16. Adding, renaming, and removing variables

### Add

1. Document the key and owner.
2. Add validation and tests.
3. Add a placeholder to `.env.example`.
4. Configure Local/test and Preview.
5. Verify failure and success paths.
6. Configure Production through the approved secret store.
7. Deploy and verify without logging the value.

### Rename

Use a two-deployment migration when downtime or integration failure is possible:

1. code temporarily accepts old and new keys, preferring the new key;
2. configure and verify the new key in every environment;
3. remove the old key from code and deployment configuration;
4. update documentation and tests.

Never keep indefinite aliases.

### Remove

1. prove the key has no runtime, build, CI, or provider dependency;
2. remove references, tests, and `.env.example` entry;
3. deploy;
4. delete/revoke the stored value and related provider credential;
5. verify logs and health checks.

---

## 17. Ownership matrix

| Responsibility | Owner |
| --- | --- |
| Variable naming and schema | Technical lead |
| Production secret entry/change | Authorized deployment owner |
| CRM scope and destination approval | Business owner + technical lead |
| Notification recipients | Business owner |
| Storage privacy and retention | Technical lead + data owner |
| Analytics identifiers and consent behavior | Analytics owner + technical lead |
| Credential rotation | Service owner |
| Documentation and tests | Implementing developer |

No single developer should invent a Production destination or activate a provider without the relevant owner approval.

---

## 18. Definition of done

Environment configuration is complete only when:

- [ ] `.env.example` contains every supported key and no real secret.
- [ ] `.gitignore` blocks local and Production environment files.
- [ ] Server and client variables are separated into typed modules.
- [ ] The build fails clearly on invalid or incomplete configuration.
- [ ] `SITE_URL` produces the correct canonical origin.
- [ ] Local, Preview, and Production use isolated credentials and destinations.
- [ ] Preview cannot create Production leads, send Production notifications, or store files in the Production bucket.
- [ ] No secret appears in client bundles, static HTML, source maps, logs, analytics, or error responses.
- [ ] Enabled integrations have timeouts and controlled failure behavior.
- [ ] Production uses HTTPS-only origins and exact host allowlists.
- [ ] Deployment-variable ownership and rotation responsibilities are documented.
- [ ] Tests cover required and contradictory configuration states.
- [ ] All affected technical documents remain consistent with this specification.

---

## 19. Final principle

Environment variables are part of the application's security and deployment contract. Ahan Asa must remain safe when an integration is disabled, fail clearly when required configuration is invalid, and keep every confidential inquiry and credential on trusted server-side boundaries.
