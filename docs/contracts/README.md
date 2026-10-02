# Website contracts (architecture V1.1, W0)

Machine-checked contracts between the website's parts and Odoo. Each document has a code twin in
`lib/contracts/` (zod schemas + types); new code imports the schema, and `lib/contracts/contracts.test.ts`
keeps document, schema and running code aligned.

| Contract | Between | Document | Schema |
|---|---|---|---|
| `rfq_intake` v1.1 | RFQ Worker / reconciler → Odoo `POST /api/v1/rfq` | [RFQ_INTAKE_V1_1.md](RFQ_INTAKE_V1_1.md) (mirror; Odoo is authoritative) | `lib/contracts/rfq-intake-v1-1.ts` |
| `rfq_submit.v1` | Browser → RFQ Worker `POST https://api.ahanassa.com/api/rfqs` | [RFQ_SUBMIT_V1.md](RFQ_SUBMIT_V1.md) | `lib/contracts/rfq-submit-v1.ts` |
| `snapshot.v1` | Odoo full fetch → CI → static build, DB_PUBLIC, `rfq_variant_index` | [SNAPSHOT_V1.md](SNAPSHOT_V1.md) | `lib/contracts/snapshot-v1.ts` |
| `artifact.v1` | Static build → staging/production deploy | [ARTIFACT_V1.md](ARTIFACT_V1.md) | `lib/contracts/artifact-v1.ts` |

Architecture reference: `AHANASSA-CF-FREE-ODOO-ARCH-V1.1` (frozen r2, 2026-10-02) — §4, §5.1, §6.1, §6.2, §7.1, §12, §17.
Versioning: a contract change that can break a consumer gets a new major (`…v2`); additive optional fields
keep the version and are recorded in the document's changelog.
