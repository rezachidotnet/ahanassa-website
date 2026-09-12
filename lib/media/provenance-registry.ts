import type { IndustrySector } from "@/lib/content/industries";

/**
 * MEDIA PROVENANCE REGISTRY — the repository's implementation of
 * 01-sources/MEDIA_GUIDELINES.md §27 ("Media Registry").
 *
 * §27 requires that "every production asset should have a structured record"
 * and explicitly allows an equivalent information model rather than a literal
 * copy of its reference schema: "The implementation may use TypeScript, JSON, a
 * CMS, or another approved content source, but the information model must
 * remain equivalent." §26 adds: "If the existing repository uses a different
 * established structure, map these roles into it instead of creating a parallel
 * asset system."
 *
 * WHY THIS FILE EXISTS AT ALL. Until now no provenance record existed anywhere
 * in this repository, which is precisely why nothing could be published into
 * the Industries / Use Cases section: §5 states "Unknown provenance defaults to
 * `restricted`", and `restricted` media "Must not be published". That single
 * rule — not a missing component, not missing copy — is what kept the section
 * dark through IND-P1 (docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md).
 * Recording real provenance is therefore the act that legitimately opens the
 * gate; it is not paperwork added after the fact.
 *
 * WHY NOT `lib/catalog/media-registry.ts`. That module already exists but
 * answers a completely different question — WHICH packshot to show for a given
 * Odoo product classification (template/group/family -> path). It records no
 * source, licence, rights holder, truth class or approval, and its own header
 * says so. §26 forbids a *parallel asset system*, not a second concern: this
 * file owns PROVENANCE (may an asset be published at all, and on what basis),
 * that one owns RESOLUTION (which asset to pick). They are deliberately not
 * merged, and this file does not touch catalog media.
 *
 * SCOPE — deliberately narrow. This registry currently covers only the three
 * assets it was created for. The ~21 pre-existing images under `public/images/`
 * are NOT backfilled here: inventing provenance for assets whose origin nobody
 * recorded would be exactly the fabrication §5 and §33 forbid, and a
 * retroactive audit of them is a separate, owner-involving task. Their absence
 * from this registry is the honest state, and it means they remain
 * unclassified — it does NOT retroactively bless them. The schema is shaped so
 * they can be added later without changing any consumer.
 */

/** §27's `MediaTruthClass`, verbatim — the §5 approval classes. */
export type MediaTruthClass = "verified-evidence" | "verified-context" | "licensed-stock" | "conceptual" | "restricted";

/** §27's `rightsStatus`. */
export type MediaRightsStatus = "owned" | "licensed" | "permission" | "restricted";

/** §27's `approvalStatus`. */
export type MediaApprovalStatus = "draft" | "approved" | "rejected" | "expired";

/**
 * How the asset reached the repository. `unknown` is retained as a real,
 * selectable value precisely so the §5 default can be enforced in code rather
 * than trusted to reviewers — see `effectiveTruthClass`.
 */
export type MediaProvenance = "owner-provided" | "licensed-stock" | "commissioned" | "captured-in-house" | "unknown";

/** §27's `purpose`. */
export type MediaPurpose = "evidence" | "explanation" | "context" | "humanization" | "navigation" | "brand";

export interface MediaProvenanceRecord {
  /** Stable internal id, independent of the public path. */
  readonly id: string;
  readonly type: "image" | "video" | "logo" | "icon" | "diagram" | "document";
  /** Canonical public asset path — always repository-local, never an external host. */
  readonly src: string;
  /** The filename exactly as the owner supplied it, so the import is auditable both ways. */
  readonly originalFilename: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: string;
  readonly provenance: MediaProvenance;
  /** Who the asset came from / who holds it. */
  readonly sourceOwner: string;
  readonly rightsStatus: MediaRightsStatus;
  /** §28.1 requires an explicit attribution-requirement record, not an assumption. */
  readonly attributionRequired: boolean;
  readonly truthClass: MediaTruthClass;
  readonly purpose: MediaPurpose;
  /** Where this record authorizes the asset to appear. */
  readonly approvedUse: string;
  /** Industries placement only — which frozen sector slot this asset serves. */
  readonly industrySector?: IndustrySector;
  /**
   * EXPLICIT, MACHINE-CHECKABLE FLAG, not prose in a note.
   *
   * `true` means: this asset must never be captioned, described, labelled or
   * presented as evidence of a real Ahan Asa project, facility, customer,
   * delivery or capability (Industries V1.0 §8; MEDIA_GUIDELINES.md §4.4, §29).
   * It is a required field so that every future entry has to answer it.
   */
  readonly notAhanAsaProjectEvidence: boolean;
  /** Rendered with empty alt because it adds no information beyond adjacent copy. */
  readonly decorative: boolean;
  readonly approvalStatus: MediaApprovalStatus;
  /** ISO date the owner approved this asset for the use above. */
  readonly approvedAt: string;
  readonly notes: string;
}

/**
 * TRUTH-CLASS NOTE FOR THE THREE INDUSTRIES ASSETS — read before changing one.
 *
 * All three are classified `conceptual`, NOT `verified-context`. That is a
 * deliberate, conservative choice and the reasoning is recorded here so nobody
 * "upgrades" it casually.
 *
 * The owner supplied and approved these three files. What is NOT established by
 * any record supplied with them is their ORIGIN — whether they are photographs
 * or synthetic/generated imagery. Nothing in the files settles it: they carry
 * no camera model, no creator, no GPS and no EXIF capture data at all, and
 * their uniform 1448x1086 dimensions match no camera sensor.
 *
 * `verified-context` would assert "Real industrial or procurement context,
 * accurately licensed" (§5). Asserting that without evidence would itself be a
 * fabricated provenance claim. `conceptual` covers "Illustration, render,
 * abstract composition, or AI-generated concept" and is the only class that is
 * correct under BOTH possibilities:
 *
 *   - if the images are generated, §29 REQUIRES `conceptual`;
 *   - if they are real photographs, `conceptual` merely under-claims, which
 *     costs nothing here because this placement makes no evidentiary claim
 *     anyway.
 *
 * Erring toward `conceptual` can only make handling stricter; erring toward
 * `verified-context` would publish an unverified truth claim. Note also that
 * `conceptual` is a PUBLISHABLE class (§5 allows "clearly conceptual
 * explanation or editorial art") — it is not `restricted`, and provenance here
 * is known, so the §5 unknown-provenance default does not apply.
 *
 * §29's public-disclosure trigger is assessed and NOT met: disclosure is
 * required "when a reasonable visitor could interpret it as documentary". These
 * render with empty alt, no caption, no number, no logo and no metric, under
 * headings that name a PURCHASING SECTOR rather than any Ahan Asa work, and
 * Industries V1.0 §10 states the sectors are "not proof of historical
 * projects". Nothing presents them as documentary. If a future placement ever
 * captions one, that assessment must be redone.
 *
 * §29's artifact review was performed by opening all three at full size:
 * no legible text, no readable branding, no customer logo, no distorted PPE, no
 * impossible structure and no misleading steel geometry or scale was found in
 * any of them.
 */

/** The project owner — CLAUDE.md §1. */
const OWNER = "Cyan Sanat Iranian Co. LTD (project owner)";

const INDUSTRIES_DIR = "/images/industries";

/** Owner supplied and approved the three Industries assets on this date. */
const INDUSTRIES_APPROVED_AT = "2026-09-12";

const INDUSTRIES_NOTE =
  "Owner-provided, owner-approved generic sector illustration for the Homepage Industries / Use Cases section. " +
  "Depicts the purchasing sector only. Not a photograph of any Ahan Asa project, facility, customer, delivery or capability, " +
  "and must never be captioned or described as one. Origin (photographic vs. generated) is not established by any supplied " +
  "record, so the conservative `conceptual` truth class applies — see the truth-class note in this module. " +
  "No third-party licence document was supplied; the rights basis is the owner's own supply and approval.";

export const MEDIA_PROVENANCE_REGISTRY: readonly MediaProvenanceRecord[] = [
  {
    id: "industries-construction-site",
    type: "image",
    src: `${INDUSTRIES_DIR}/construction-site.png`,
    originalFilename: "picp-building.png",
    width: 1448,
    height: 1086,
    aspectRatio: "4:3",
    provenance: "owner-provided",
    sourceOwner: OWNER,
    rightsStatus: "owned",
    attributionRequired: false,
    truthClass: "conceptual",
    purpose: "context",
    approvedUse: "Homepage Industries / Use Cases",
    industrySector: "construction",
    notAhanAsaProjectEvidence: true,
    decorative: true,
    approvalStatus: "approved",
    approvedAt: INDUSTRIES_APPROVED_AT,
    notes: `Multi-storey steel-frame building under construction: structural columns and beams, rebar bundles and stock sections in the foreground, workers in hard hats, urban background. Matches Industries V1.0 §8 slot 1 ("a building site, structural steel erection or reinforcement context"). ${INDUSTRIES_NOTE}`,
  },
  {
    id: "industries-petrochemical-facility",
    type: "image",
    src: `${INDUSTRIES_DIR}/petrochemical-facility.png`,
    originalFilename: "pic-oil.png",
    width: 1448,
    height: 1086,
    aspectRatio: "4:3",
    provenance: "owner-provided",
    sourceOwner: OWNER,
    rightsStatus: "owned",
    attributionRequired: false,
    truthClass: "conceptual",
    purpose: "context",
    approvedUse: "Homepage Industries / Use Cases",
    industrySector: "petrochemical-oil-gas",
    notAhanAsaProjectEvidence: true,
    decorative: true,
    approvalStatus: "approved",
    approvedAt: INDUSTRIES_APPROVED_AT,
    notes: `Industrial process facility: elevated pipe racks, distillation/process towers, open desert setting. Matches Industries V1.0 §8 slot 2 ("a relevant industrial facility and piping context"). Deliberately NOT a steel mill — IND-P1 rejected ops/mill-exterior.png for this slot because presenting a steel plant as a petrochemical one is the misleading-media case MEDIA_GUIDELINES.md §4.4 forbids. ${INDUSTRIES_NOTE}`,
  },
  {
    id: "industries-fabrication-workshop",
    type: "image",
    src: `${INDUSTRIES_DIR}/fabrication-workshop.png`,
    originalFilename: "pic-work.png",
    width: 1448,
    height: 1086,
    aspectRatio: "4:3",
    provenance: "owner-provided",
    sourceOwner: OWNER,
    rightsStatus: "owned",
    attributionRequired: false,
    truthClass: "conceptual",
    purpose: "context",
    approvedUse: "Homepage Industries / Use Cases",
    industrySector: "manufacturing-fabrication",
    notAhanAsaProjectEvidence: true,
    decorative: true,
    approvalStatus: "approved",
    approvedAt: INDUSTRIES_APPROVED_AT,
    notes: `Metal fabrication workshop: a radial drill press working a steel I-beam, with structural steel stock, benches and a worker in the background. Matches Industries V1.0 §8 slot 3 ("a workshop, steel fabrication or production context"). Deliberately NOT a storage warehouse — IND-P1 rejected ops/warehouse.png for this slot as storage rather than fabrication. ${INDUSTRIES_NOTE}`,
  },
];

/**
 * The §5 rule, enforced in code rather than trusted to a reviewer:
 *
 *   > "Unknown provenance defaults to `restricted`."
 *
 * An asset whose provenance is unknown, or which is not approved, resolves to
 * `restricted` REGARDLESS of the truth class its record claims — so a record
 * cannot declare itself publishable by simply writing a friendlier class into
 * the `truthClass` field.
 */
export function effectiveTruthClass(record: MediaProvenanceRecord): MediaTruthClass {
  if (record.provenance === "unknown") return "restricted";
  if (record.rightsStatus === "restricted") return "restricted";
  if (record.approvalStatus !== "approved") return "restricted";
  return record.truthClass;
}

/**
 * §5: `restricted` media "Must not be published", and §27: "`restricted`
 * assets must never resolve to a public URL."
 */
export function isPublishable(record: MediaProvenanceRecord): boolean {
  return effectiveTruthClass(record) !== "restricted";
}

/** Look a record up by its canonical public path. `null` when unregistered. */
export function findMediaRecord(src: string): MediaProvenanceRecord | null {
  return MEDIA_PROVENANCE_REGISTRY.find((record) => record.src === src) ?? null;
}

/**
 * The provenance record for one frozen Industries sector slot, or `null`.
 * Returns `null` for an unpublishable record too, so a caller can never obtain
 * a `restricted` asset's path through this function.
 */
export function findIndustrySectorMedia(sector: IndustrySector): MediaProvenanceRecord | null {
  const record = MEDIA_PROVENANCE_REGISTRY.find((entry) => entry.industrySector === sector);
  if (!record || !isPublishable(record)) return null;
  return record;
}
