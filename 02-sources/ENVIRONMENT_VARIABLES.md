# Environment Variables and Cloudflare Bindings

**Project:** Ahan Asa (`ahanassa.com`)  
**Status:** Implementation contract  
**Runtime:** Next.js App Router on Cloudflare Workers  
**Commercial system of record:** Odoo at `https://odoo.ahanassa.com`  
**Canonical production origin:** `https://www.ahanassa.com`  
**Last updated:** 2026-08-26

---

## 1. Purpose

This document is the authoritative registry for deployment-specific configuration, Cloudflare resource bindings, feature flags, and secrets used by the Ahan Asa website and its Odoo integration worker.

It exists to ensure that:

- public pages remain fast and independent of live Odoo availability;
- D1, R2, and Queue resources are configured as typed Cloudflare bindings rather than string credentials;
- secrets never enter Git, browser bundles, static HTML, logs, analytics, cache keys, or error responses;
- local, preview, staging, and production environments use isolated resources and credentials;
- the public website worker receives only the permissions it needs;
- Odoo credentials exist only in the integration worker;
- configuration errors fail deployment or the affected feature safely;
- every configuration name has one meaning across the repository.

Read this document with:

- `STACK.md`
- `TECHNICAL_ARCHITECTURE.md`
- `DEPLOYMENT_ARCHITECTURE.md`
- `SECURITY_GUIDELINES.md`
- `API_INTEGRATIONS.md`
- `ODOO_INTEGRATION.md`
- `SYNC_STRATEGY.md`
- `RFQ_SYSTEM.md`

---

## 2. Configuration classes

Do not call every runtime value an environment variable. The project has four distinct configuration classes.

| Class | Examples | Storage | Browser-visible? |
| --- | --- | --- | --- |
| Cloudflare resource binding | D1, R2, Queue | `wrangler.jsonc` / Cloudflare resource binding | No |
| Plain runtime variable | origin, timeout, feature flag | Wrangler `vars` or deployment environment | No, unless explicitly prefixed `NEXT_PUBLIC_` |
| Secret binding | Odoo API key, Resend token, signing key | Cloudflare Secrets | No |
| Build/CI credential | Cloudflare deploy token | CI secret store | No; not available to application runtime |

### 2.1 Binding rule

`DB_PUBLIC`, `DB_OPS`, `PUBLIC_MEDIA`, `RFQ_ATTACHMENTS`, and `ODOO_SYNC_QUEUE` are Cloudflare bindings. They are not URLs, IDs, access keys, or `.env` strings read by application code.

### 2.2 Public-variable rule

Only names beginning with `NEXT_PUBLIC_` may be included in client JavaScript. The prefix means **public**, not protected. Never place credentials, internal URLs, recipient lists, database identifiers, object keys, or private feature state under that prefix.

### 2.3 Content rule

Fixed product behavior and editorial content do not belong in environment variables. Supported locales, navigation, schema types, file-type allowlists, unit definitions, SEO copy, design tokens, and product taxonomy belong in typed source configuration, D1, or the CMS.

---

## 3. Environment topology

| Environment | `APP_ENV` | Purpose | Indexing | External writes |
| --- | --- | --- | --- | --- |
| Local | `local` | Development and automated tests | Never public | Mock/test only |
| Preview | `preview` | Pull-request and stakeholder review | `noindex, nofollow` | Disabled by default |
| Staging | `staging` | Integration, migration, Odoo sandbox, load and recovery tests | `noindex, nofollow` | Test systems only |
| Production | `production` | Public website and live operations | Allowed by route policy | Approved production systems |

Rules:

1. Each environment uses separate D1 databases, R2 buckets, Queues, DLQ, Turnstile host configuration, email destination, and Odoo credentials.
2. Production secrets are never available to local, preview, or staging deployments.
3. A branch name, hostname, `NODE_ENV`, or preview URL must never activate production behavior.
4. Application behavior uses `APP_ENV`; `NODE_ENV` remains framework-controlled.
5. Preview and staging responses enforce `noindex, nofollow` server-side. A client flag is not sufficient.
6. Production requires `APP_BASE_URL=https://www.ahanassa.com`.
7. `https://ahanassa.com` redirects permanently to the canonical `www` origin and is included only where host validation requires accepting the redirect request.

---

## 4. Worker boundary and secret minimization

Use separate runtime boundaries even if they live in one repository.

| Runtime | Responsibilities | Must not receive |
| --- | --- | --- |
| Web Worker | Public site, CMS/admin routes, RFQ intake, D1 persistence, R2 upload, Queue producer, Turnstile, email receipt | `ODOO_API_KEY`, Odoo write access |
| Odoo Integration Worker | Queue consumer, Odoo adapter, product/price sync, retry, reconciliation | Public analytics identifiers, browser-only configuration |
| Recovery/Admin Worker or protected handler | DLQ inspection/replay, scheduled repair jobs | Unrelated credentials |

The web request path is:

```text
Browser -> Web Worker -> DB_OPS transaction -> ODOO_SYNC_QUEUE -> acknowledgement
```

The asynchronous path is:

```text
ODOO_SYNC_QUEUE -> Integration Worker -> Odoo
                          |                |
                          +-> DB_OPS ------+
                          +-> DB_PUBLIC after validated public sync
```

Public page rendering and RFQ acknowledgement must never wait for a live Odoo response.

---

## 5. Authoritative Cloudflare binding registry

### 5.1 Web Worker bindings

| Binding | Type | Required | Purpose | Data restriction |
| --- | --- | --- | --- | --- |
| `DB_PUBLIC` | D1 | Always | Published articles, SEO data, public catalog and public price read model | No visitor PII or private operational data |
| `DB_OPS` | D1 | RFQ/admin enabled | RFQs, contacts, consent, attachment metadata, audit, outbox, sync state | Server-only; never public-cacheable |
| `PUBLIC_MEDIA` | R2 | CMS/media enabled | Approved public article and product media | Public assets only |
| `RFQ_ATTACHMENTS` | R2 | Attachment feature enabled | Private RFQ Excel, PDF, and image files | Private, non-listable, non-cacheable |
| `ODOO_SYNC_QUEUE` | Queue producer | Odoo RFQ sync enabled | Enqueue durable RFQ/outbox events | No raw file bytes; identifiers and approved payload only |

### 5.2 Integration Worker bindings

| Binding | Type | Required | Purpose |
| --- | --- | --- | --- |
| `DB_PUBLIC` | D1 | Catalog/price sync enabled | Publish validated public product and price projections |
| `DB_OPS` | D1 | Always | Read outbox/integration state and record attempts/results |
| `RFQ_ATTACHMENTS` | R2 | Odoo attachment transfer enabled | Read authorized private files for controlled transfer |
| `ODOO_SYNC_QUEUE` | Queue consumer | Always | Consume async Website -> Odoo jobs |
| `ODOO_SYNC_DLQ` | Queue / recovery binding | Recovery tooling enabled | Inspect or replay poison messages through an authorized workflow |

`ODOO_SYNC_DLQ` is primarily a Queue consumer configuration target. Bind it to application code only when an approved replay or inspection workflow needs it.

### 5.3 Binding requirements

- Declare every binding explicitly for every Wrangler environment; binding configuration is not assumed to inherit.
- Never bind a production D1 database, R2 bucket, or Queue to preview or staging.
- Generate TypeScript types from the committed Wrangler configuration.
- CI must compare required binding names against the generated Worker environment type.
- Resource IDs and bucket/queue names may appear in infrastructure configuration; credentials may not.
- Cloudflare Web Analytics does not require a server secret when configured through the approved Cloudflare integration.

---

## 6. Plain server-variable registry

### 6.1 Core application

| Name | Required | Example | Validation / use |
| --- | --- | --- | --- |
| `APP_ENV` | Always | `staging` | `local`, `preview`, `staging`, `production` |
| `APP_BASE_URL` | Always | `https://www.ahanassa.com` | Absolute origin, no path or trailing slash |
| `ALLOWED_HOSTS` | Preview/staging/production | `www.ahanassa.com,ahanassa.com` | Exact hostnames; no schemes or wildcards |
| `ALLOWED_ORIGINS` | Stateful APIs enabled | `https://www.ahanassa.com` | Exact origins for sensitive POST checks |
| `LOG_LEVEL` | Optional | `info` | `debug`, `info`, `warn`, `error`; production default `info` |
| `RELEASE_ID` | Optional | Git commit SHA | Non-sensitive deploy correlation only |

`APP_BASE_URL` is the only canonical-origin source for metadata, canonical URLs, Open Graph URLs, sitemap entries, robots rules, server-generated links, and receipt URLs.

`SITE_URL` is deprecated and must not be introduced. Existing references must migrate to `APP_BASE_URL` in the same implementation phase.

### 6.2 Odoo adapter

| Name | Runtime | Required | Production value / rule |
| --- | --- | --- | --- |
| `ODOO_BASE_URL` | Integration | Odoo sync enabled | `https://odoo.ahanassa.com`; no trailing slash |
| `ODOO_DATABASE` | Integration | Database header/login requires it | Exact approved database name; treat as sensitive config |
| `ODOO_API_MODE` | Integration | Odoo sync enabled | `json2`, `legacy_rpc`, or `custom_controller` |
| `ODOO_COMPANY_ID` | Integration | Multi-company Odoo | Positive integer |
| `ODOO_PUBLIC_PRICELIST_ID` | Integration | Public-price sync enabled | Positive integer; authoritative public pricelist |
| `ODOO_REQUEST_TIMEOUT_MS` | Integration | Optional | Default `8000`; range `1000..15000` |
| `ODOO_SYNC_BATCH_SIZE` | Integration | Optional | Default `50`; bounded by tested Odoo limits |

Important:

- The exact Odoo version and installed modules are not yet confirmed in this document.
- `ODOO_API_MODE=json2` is allowed only after confirming Odoo 19+ JSON-2 support and the required model methods.
- JSON-2 authentication uses the secret API key as a Bearer token and may require the configured database header.
- Legacy RPC or a custom controller remains behind the same adapter contract; no page, component, or route calls Odoo directly.
- Do not store Odoo model names, field mappings, or business workflows in environment variables. Those belong in `ERP_DATA_MAPPING.md` and typed adapter code.

### 6.3 Price publication and freshness

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `PRICE_FRESHNESS_THRESHOLD_SECONDS` | Public prices enabled | `3600` | After this age, UI applies the stale-price policy |
| `PRICE_SYNC_CRON` | Scheduled sync enabled | `*/15 * * * *` | Prefer Wrangler trigger configuration; define here only if scheduler implementation requires a value |

The website reads public prices from `DB_PUBLIC`. It never fetches a public page price synchronously from Odoo.

### 6.4 RFQ and upload limits

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `UPLOAD_MAX_BYTES` | Attachments enabled | `10485760` | Maximum bytes per file; server-enforced |
| `UPLOAD_MAX_COUNT` | Attachments enabled | `5` | Positive integer; server-enforced |
| `SIGNED_URL_TTL_SECONDS` | Signed access enabled | `300` | Range `60..900`; private files only |
| `RFQ_IDEMPOTENCY_TTL_SECONDS` | RFQ enabled | `86400` | Must cover browser retry and Queue duplication window |

Allowed extensions, MIME types, magic-byte checks, parser limits, and retention periods belong in reviewed security configuration, not operator-editable environment variables.

### 6.5 Cloudflare Access

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `TEAM_DOMAIN` | Admin protected by Access | `https://team-name.cloudflareaccess.com` | Exact HTTPS issuer/team domain |
| `POLICY_AUD` | Admin protected by Access | `<access-audience-tag>` | Validate the Access JWT audience server-side |

Cloudflare Access is an outer identity boundary. The application must still validate the Access JWT and apply its own server-side RBAC for `Admin`, `Editor`, `Price Operator`, and `Sales Operator` actions.

### 6.6 Email

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `EMAIL_PROVIDER` | Email feature enabled | `resend` | Must match an implemented server adapter |
| `EMAIL_FROM` | Email feature enabled | `Ahan Asa <website@ahanassa.com>` | Verified sending domain |
| `EMAIL_INTERNAL_RECIPIENTS` | Internal notification enabled | `<approved-addresses>` | Comma-separated allowlist; server-only sensitive config |
| `EMAIL_REPLY_TO` | Optional | `info@ahanassa.com` | Static approved address; never copied directly from form input |

### 6.7 Turnstile

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `TURNSTILE_EXPECTED_HOSTNAMES` | RFQ/admin public forms enabled | `www.ahanassa.com,ahanassa.com` | Exact hostnames checked with verification result |

---

## 7. Public client-variable registry

| Name | Required | Example | Rule |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_ENV` | Always | `production` | Display/diagnostic behavior only; never authorizes actions |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile enabled | `<public-site-key>` | Public by design |
| `NEXT_PUBLIC_GTM_ID` | GTM enabled | `GTM-XXXXXXX` | Validate `^GTM-[A-Z0-9]+$` |
| `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Manual Web Analytics beacon used | `<public-token>` | Public by design; omit if Cloudflare manages injection |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Optional | `false` | Default `false` outside production |
| `NEXT_PUBLIC_CONSENT_MODE` | Analytics enabled | `required` | `required` or `disabled`; production default `required` |

Analytics must never receive RFQ text, company/contact details, phone numbers, emails, filenames, object keys, Odoo IDs, or document contents.

`NEXT_PUBLIC_*` values referenced by browser code may be embedded during the Next.js build. Configure the same approved public values in the Workers build environment when the selected adapter requires build-time access, and redeploy after changing them. Runtime changes alone do not rewrite an already-built client bundle.

---

## 8. Secret registry

| Name | Runtime | Required when | Purpose |
| --- | --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Web | Turnstile enabled | Server-side token verification |
| `EMAIL_API_TOKEN` | Web | Email enabled | Resend or approved provider API authentication |
| `INQUIRY_REFERENCE_SECRET` | Web | Public RFQ references enabled | HMAC/signing for non-guessable references |
| `UPLOAD_SIGNING_SECRET` | Web/recovery | Signed upload/download flow enabled | Sign scoped private-file operations |
| `WEBHOOK_SIGNING_SECRET` | Integration | Signed Odoo webhook enabled | Verify/sign integration webhooks |
| `ODOO_API_KEY` | Integration only | Odoo sync enabled | Dedicated least-privilege bot credential |

Requirements:

- Every secret is unique per environment and purpose.
- Use a dedicated Odoo integration user such as `ahanasa_website_bot` with minimum access rights and record rules.
- Never place a secret in `wrangler.jsonc`, `.env.example`, `.dev.vars.example`, Markdown examples, test snapshots, screenshots, logs, or tickets.
- Never reuse `UPLOAD_SIGNING_SECRET`, `WEBHOOK_SIGNING_SECRET`, and `INQUIRY_REFERENCE_SECRET`.
- Signing secrets must have at least 32 cryptographically random bytes.
- `ODOO_API_KEY` is unavailable to the Web Worker.
- Rotate immediately after suspected disclosure, Git commit, staff/vendor access removal, or provider security event.

---

## 9. Feature flags

All feature flags are plain server variables serialized exactly as `true` or `false`.

| Name | Default outside production | Effect |
| --- | --- | --- |
| `FEATURE_RFQ_SUBMISSION` | `true` locally with mock persistence; otherwise `false` until configured | Accept new RFQs |
| `FEATURE_RFQ_ATTACHMENTS` | `false` | Enable private Excel/PDF/image uploads |
| `FEATURE_ODOO_RFQ_SYNC` | `false` | Queue and process customer/RFQ sync |
| `FEATURE_ODOO_CATALOG_SYNC` | `false` | Synchronize products, variants, units, and approved public fields |
| `FEATURE_PUBLIC_PRICES` | `false` | Display cached public prices and price structured data |
| `FEATURE_CUSTOMER_RECEIPT_EMAIL` | `false` | Send submitter receipt after durable acceptance |
| `FEATURE_WHATSAPP_LINK` | `true` | Render configured WhatsApp contact link |
| `FEATURE_PUBLIC_RFQ_STATUS` | `false` | Allow signed public status lookup |

Feature flags are operational controls, not security controls. Authorization, validation, persistence, origin checks, rate limits, and data isolation remain mandatory.

### 9.1 Required dependencies

| Condition | Required configuration |
| --- | --- |
| `FEATURE_RFQ_SUBMISSION=true` | `DB_OPS`, Turnstile in production, idempotency configuration |
| `FEATURE_RFQ_ATTACHMENTS=true` | `RFQ_ATTACHMENTS`, upload limits, signing secret if signed operations are used |
| `FEATURE_ODOO_RFQ_SYNC=true` | `DB_OPS`, `ODOO_SYNC_QUEUE`, Integration Worker, Odoo variables and `ODOO_API_KEY` |
| `FEATURE_ODOO_CATALOG_SYNC=true` | `DB_PUBLIC`, Integration Worker, Odoo variables and `ODOO_API_KEY` |
| `FEATURE_PUBLIC_PRICES=true` | `DB_PUBLIC`, pricelist ID, freshness threshold, successful sync health |
| `FEATURE_CUSTOMER_RECEIPT_EMAIL=true` | email provider, token, verified sender |
| `FEATURE_PUBLIC_RFQ_STATUS=true` | signed reference secret, `DB_OPS`, no-store response policy |

Disabling Odoo sync must not disable RFQ persistence. Disabling public prices must remove price claims and Offer structured data rather than showing stale or placeholder prices as current.

---

## 10. Build and CI-only values

These values belong in the CI system and are not application runtime variables.

| Name | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Automated deploy | Target Cloudflare account |
| `CLOUDFLARE_API_TOKEN` | Automated deploy | Least-privilege deployment credential |
| `SENTRY_AUTH_TOKEN` or provider equivalent | Optional release upload only | Upload source maps/releases when observability provider is approved |

Rules:

- Deployment tokens receive only the account/zone/resource permissions required by the pipeline.
- CI credentials are unavailable to runtime code.
- Untrusted pull requests do not receive deploy or production secrets.
- Build logs must not print variable values.
- A release artifact is promoted only with the bindings and secrets for its target environment.

---

## 11. Wrangler configuration contract

The committed `wrangler.jsonc` is the source of truth for resource binding names and non-secret defaults. Resource IDs below are placeholders.

```jsonc
{
  "name": "ahanasa-web",
  "compatibility_date": "2026-08-26",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "APP_ENV": "local",
    "APP_BASE_URL": "http://localhost:3000",
    "ALLOWED_HOSTS": "localhost,127.0.0.1",
    "ALLOWED_ORIGINS": "http://localhost:3000",
    "LOG_LEVEL": "debug",
    "FEATURE_RFQ_SUBMISSION": "true",
    "FEATURE_RFQ_ATTACHMENTS": "false",
    "FEATURE_ODOO_RFQ_SYNC": "false",
    "FEATURE_PUBLIC_PRICES": "false"
  },
  "d1_databases": [
    { "binding": "DB_PUBLIC", "database_name": "ahanasa-public-local", "database_id": "<local-public-d1-id>" },
    { "binding": "DB_OPS", "database_name": "ahanasa-ops-local", "database_id": "<local-ops-d1-id>" }
  ],
  "r2_buckets": [
    { "binding": "PUBLIC_MEDIA", "bucket_name": "ahanasa-public-media-local" },
    { "binding": "RFQ_ATTACHMENTS", "bucket_name": "ahanasa-rfq-attachments-local" }
  ],
  "queues": {
    "producers": [
      { "binding": "ODOO_SYNC_QUEUE", "queue": "ahanasa-odoo-sync-local" }
    ]
  },
  "env": {
    "preview": {
      "vars": {
        "APP_ENV": "preview",
        "APP_BASE_URL": "https://preview.ahanassa.com",
        "ALLOWED_HOSTS": "preview.ahanassa.com",
        "ALLOWED_ORIGINS": "https://preview.ahanassa.com",
        "LOG_LEVEL": "info",
        "FEATURE_RFQ_SUBMISSION": "false",
        "FEATURE_RFQ_ATTACHMENTS": "false",
        "FEATURE_ODOO_RFQ_SYNC": "false",
        "FEATURE_PUBLIC_PRICES": "false"
      },
      "d1_databases": [
        { "binding": "DB_PUBLIC", "database_name": "ahanasa-public-preview", "database_id": "<preview-public-d1-id>" },
        { "binding": "DB_OPS", "database_name": "ahanasa-ops-preview", "database_id": "<preview-ops-d1-id>" }
      ],
      "r2_buckets": [
        { "binding": "PUBLIC_MEDIA", "bucket_name": "ahanasa-public-media-preview" },
        { "binding": "RFQ_ATTACHMENTS", "bucket_name": "ahanasa-rfq-attachments-preview" }
      ],
      "queues": {
        "producers": [
          { "binding": "ODOO_SYNC_QUEUE", "queue": "ahanasa-odoo-sync-preview" }
        ]
      }
    },
    "staging": {
      "vars": {
        "APP_ENV": "staging",
        "APP_BASE_URL": "https://staging.ahanassa.com",
        "ALLOWED_HOSTS": "staging.ahanassa.com",
        "ALLOWED_ORIGINS": "https://staging.ahanassa.com",
        "LOG_LEVEL": "info",
        "FEATURE_RFQ_SUBMISSION": "true",
        "FEATURE_RFQ_ATTACHMENTS": "true",
        "FEATURE_ODOO_RFQ_SYNC": "true",
        "FEATURE_PUBLIC_PRICES": "true"
      },
      "d1_databases": [
        { "binding": "DB_PUBLIC", "database_name": "ahanasa-public-staging", "database_id": "<staging-public-d1-id>" },
        { "binding": "DB_OPS", "database_name": "ahanasa-ops-staging", "database_id": "<staging-ops-d1-id>" }
      ],
      "r2_buckets": [
        { "binding": "PUBLIC_MEDIA", "bucket_name": "ahanasa-public-media-staging" },
        { "binding": "RFQ_ATTACHMENTS", "bucket_name": "ahanasa-rfq-attachments-staging" }
      ],
      "queues": {
        "producers": [
          { "binding": "ODOO_SYNC_QUEUE", "queue": "ahanasa-odoo-sync-staging" }
        ]
      }
    },
    "production": {
      "vars": {
        "APP_ENV": "production",
        "APP_BASE_URL": "https://www.ahanassa.com",
        "ALLOWED_HOSTS": "www.ahanassa.com,ahanassa.com",
        "ALLOWED_ORIGINS": "https://www.ahanassa.com",
        "LOG_LEVEL": "info",
        "FEATURE_RFQ_SUBMISSION": "true",
        "FEATURE_RFQ_ATTACHMENTS": "true",
        "FEATURE_ODOO_RFQ_SYNC": "true",
        "FEATURE_PUBLIC_PRICES": "true"
      },
      "d1_databases": [
        { "binding": "DB_PUBLIC", "database_name": "ahanasa-public-production", "database_id": "<production-public-d1-id>" },
        { "binding": "DB_OPS", "database_name": "ahanasa-ops-production", "database_id": "<production-ops-d1-id>" }
      ],
      "r2_buckets": [
        { "binding": "PUBLIC_MEDIA", "bucket_name": "ahanasa-public-media-production" },
        { "binding": "RFQ_ATTACHMENTS", "bucket_name": "ahanasa-rfq-attachments-production" }
      ],
      "queues": {
        "producers": [
          { "binding": "ODOO_SYNC_QUEUE", "queue": "ahanasa-odoo-sync-production" }
        ]
      }
    }
  }
}
```

This is a naming and isolation example, not a copy-paste deployment file. The selected Next.js-on-Workers adapter may add generated asset, cache, or service bindings. Those additions must preserve the names and security boundaries in this document.

Cloudflare `vars` and resource bindings are non-inheritable across Wrangler environments. Repeat the complete intended set in each environment rather than relying on top-level values.

---

## 12. Local secret template

Use exactly one local runtime-secret file supported by the selected Workers development path. Prefer `.dev.vars` when using Wrangler-native local development. Do not maintain both `.dev.vars` and `.env` for the same Worker because loading precedence becomes ambiguous.

Commit `.dev.vars.example` with empty placeholders:

```dotenv
# Public-by-design client values
NEXT_PUBLIC_SITE_ENV=local
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN=
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_CONSENT_MODE=required

# Web Worker secrets
TURNSTILE_SECRET_KEY=
EMAIL_API_TOKEN=
INQUIRY_REFERENCE_SECRET=
UPLOAD_SIGNING_SECRET=

# Integration Worker secrets -- use test credentials only locally
ODOO_API_KEY=
WEBHOOK_SIGNING_SECRET=
```

Non-secret runtime variables should normally remain in Wrangler `vars`, not be duplicated in `.dev.vars`.

Required ignore rules:

```gitignore
.dev.vars
.dev.vars.*
!.dev.vars.example
.env
.env.*
!.env.example
```

If `.env.example` exists for framework build variables, it may contain only safe placeholders and must not duplicate secret-loading behavior without an explicit comment explaining the selected development path.

---

## 13. Typed runtime access

Application code must not read arbitrary `process.env` values throughout components. Use a central server-only configuration module and a separate explicit client module.

Recommended structure:

```text
src/config/
├── cloudflare-env.d.ts
├── server-env.ts
├── client-env.ts
└── feature-flags.ts
```

Minimum binding interface:

```ts
interface AhanAsaWebEnv {
  DB_PUBLIC: D1Database;
  DB_OPS: D1Database;
  PUBLIC_MEDIA: R2Bucket;
  RFQ_ATTACHMENTS: R2Bucket;
  ODOO_SYNC_QUEUE: Queue<OdooSyncMessage>;

  APP_ENV: "local" | "preview" | "staging" | "production";
  APP_BASE_URL: string;
  ALLOWED_HOSTS: string;
  ALLOWED_ORIGINS: string;

  TURNSTILE_SECRET_KEY?: string;
  EMAIL_API_TOKEN?: string;
  INQUIRY_REFERENCE_SECRET?: string;
  UPLOAD_SIGNING_SECRET?: string;
}

interface AhanAsaIntegrationEnv {
  DB_PUBLIC: D1Database;
  DB_OPS: D1Database;
  RFQ_ATTACHMENTS: R2Bucket;

  ODOO_BASE_URL: string;
  ODOO_DATABASE?: string;
  ODOO_API_MODE: "json2" | "legacy_rpc" | "custom_controller";
  ODOO_COMPANY_ID?: string;
  ODOO_PUBLIC_PRICELIST_ID?: string;
  ODOO_API_KEY: string;
  WEBHOOK_SIGNING_SECRET?: string;
}
```

Use the Workers runtime binding interface supported by the selected adapter and generate binding types with Wrangler. Server Components, Route Handlers, Server Actions, Queue consumers, and scheduled handlers may access server configuration. Client Components may import only the explicit public registry.

Validation must:

- parse booleans and integers instead of relying on JavaScript truthiness;
- normalize origins without trailing slashes;
- reject wildcard production hosts/origins;
- reject production with a non-canonical `APP_BASE_URL`;
- reject enabled features whose bindings or secrets are missing;
- reject preview/staging configuration that targets production resources;
- report missing key names without logging values.

---

## 14. Deployment matrix

| Group | Local | Preview | Staging | Production |
| --- | --- | --- | --- | --- |
| D1 | Local isolated | Preview isolated | Staging isolated | Production isolated |
| Public R2 | Local | Preview | Staging | Production |
| Private R2 | Local/test | Preview/test | Staging/test | Production private |
| Queue/DLQ | Local/test | Disabled or preview | Staging | Production |
| Odoo | Mock/test | Disabled | Sandbox/test company | Production bot user |
| Email | Disabled/local sink | Disabled/test | Test recipients | Approved recipients |
| Turnstile | Test/disabled | Preview host | Staging host | Production hosts |
| Analytics | Disabled | Disabled | Test property only | Approved production property |
| Cloudflare Access | Optional local bypass with explicit dev guard | Required | Required | Required for `/admin` |

No deployment may mix rows from different columns.

---

## 15. Secret creation, rotation, and recovery

### 15.1 Creation

- Generate random secrets with a cryptographically secure generator.
- Create separate service credentials for each runtime and environment.
- Limit the Odoo bot to approved models, companies, methods, and records.
- Limit email credentials to sending from the approved domain.
- Limit Cloudflare deploy tokens to required account, Worker, D1, R2, Queue, and zone actions.

### 15.2 Rotation

1. Create a replacement credential with equal or smaller scope.
2. Add it to the target Cloudflare Secret or CI secret store.
3. Deploy and verify the affected integration with correlation IDs and redacted logs.
4. Revoke the old credential.
5. Record who changed it, when, why, and which environments were affected—never the value.

Rotate immediately after suspected exposure or an accidental Git commit. Removing the text from the latest commit is not revocation.

### 15.3 Odoo outage

Environment configuration must preserve this behavior:

```text
RFQ saved in DB_OPS -> Queue accepted -> visitor receives reference
                                  |
                                  +-> Odoo failure -> retry -> DLQ -> authorized replay
```

A missing or invalid Odoo credential stops the integration consumer and raises an operational alert. It must not reject already durable RFQs or cause the web worker to call Odoo directly.

---

## 16. Logging, analytics, and cache prohibitions

Never log or include in analytics/cache keys:

- any secret or authorization header;
- the full Worker environment object;
- phone, email, address, company contact data, consent text, or RFQ description;
- attachment filename, contents, signed URL, private object key, or document metadata;
- Odoo database name, API response body, internal record ID, or error containing credentials;
- Cloudflare Access JWTs;
- email recipient lists.

Allowed diagnostic fields include environment name, release ID, adapter name, event type, non-sensitive correlation ID, attempt count, elapsed time, status category, and the name—not value—of a missing configuration key.

Public HTML, public API responses, sitemaps, metadata, JSON-LD, and cached responses must remain free of server configuration except intentionally public URLs and identifiers.

---

## 17. Automated tests and deployment gates

CI must test:

1. missing required core variables;
2. malformed origins, hosts, booleans, integers, and timeout ranges;
3. production with any `APP_BASE_URL` other than `https://www.ahanassa.com`;
4. enabled features with missing bindings or secrets;
5. preview/staging names or resource IDs matching production resources;
6. Web Worker type/config containing `ODOO_API_KEY`;
7. client bundle containing any server-only key name or secret fixture;
8. Turnstile enabled without site key, secret, or expected hostname;
9. Odoo sync enabled without Queue, DB, adapter mode, or API key;
10. public prices enabled without pricelist and freshness configuration;
11. analytics enabled outside production without a test-only identifier;
12. secret and PII redaction from logs and errors;
13. duplicate Queue delivery and idempotent Odoo handling;
14. Odoo outage without loss of the durable RFQ;
15. generated Worker binding types matching the registry.

Deployment fails closed when production configuration is invalid. An optional unavailable provider must not break static/public rendering.

---

## 18. Change protocol

When adding or changing configuration, the implementing agent/developer must:

1. explain why the value is deployment-specific;
2. classify it as binding, plain variable, public variable, secret, or CI credential;
3. assign it to the smallest runtime boundary;
4. add a safe placeholder only where appropriate;
5. update Wrangler configuration and generated types for bindings;
6. update typed parsing and conditional validation;
7. add automated failure and success tests;
8. update this registry and affected architecture documents;
9. state which environments require it;
10. provide a two-deployment migration for renames used in production;
11. confirm that no confidential value enters the client, build artifact, logs, analytics, or cache.

Do not silently introduce aliases. The current normalization decision is:

```text
Canonical: APP_BASE_URL
Deprecated: SITE_URL

Canonical: ODOO_PUBLIC_PRICELIST_ID
Deprecated: PUBLIC_PRICE_LIST_ID

Canonical: PRICE_FRESHNESS_THRESHOLD_SECONDS
Deprecated: PRICE_FRESHNESS_THRESHOLD
```

Old names may be accepted only during a documented migration release and must then be removed.

---

## 19. Definition of done

- [ ] Every supported key appears exactly once in this registry.
- [ ] D1, R2, and Queue resources are typed bindings, not string secrets.
- [ ] `DB_PUBLIC` and `DB_OPS` are separate in every non-local environment.
- [ ] Public and private R2 buckets are separate.
- [ ] Preview, staging, and production resources are isolated.
- [ ] Production canonical origin is `https://www.ahanassa.com`.
- [ ] Odoo credentials exist only in the Integration Worker.
- [ ] Odoo API mode is explicitly configured after version confirmation.
- [ ] RFQ persistence succeeds independently of Odoo availability.
- [ ] Feature dependencies fail safely when incomplete.
- [ ] `/admin` validates Cloudflare Access JWTs and application RBAC.
- [ ] No secret is committed or exposed to browser/static output.
- [ ] Local secret files are ignored and contain test credentials only.
- [ ] Wrangler binding types are generated and checked in CI.
- [ ] Secret rotation and incident procedures are tested and documented.
- [ ] Related architecture documents use the canonical names defined here.

---

## 20. Official implementation references

- [Cloudflare Workers environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler configuration and environments](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Next.js on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Odoo 19 External JSON-2 API](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)

---

## 21. Final principle

Environment configuration is part of Ahan Asa's security, reliability, SEO, and deployment contract. The website must render public content from Cloudflare-controlled read paths, accept RFQs durably before background work, and keep Odoo credentials and commercial operations behind an isolated server-to-server integration boundary.
