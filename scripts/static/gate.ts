/** Re-runs the artifact.v1 gate on an existing artifact: `npm run static:gate -- <artifactDir>` (default .artifact). */
import path from "node:path";
import { runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { CONTACT_PHONE_E164 } from "../../lib/content/contact-channels.ts";

const dir = path.resolve(process.argv[2] ?? ".artifact");
const result = runArtifactGate(dir, { companyPhones: [CONTACT_PHONE_E164] });
console.log(JSON.stringify(result.stats));
for (const f of result.failures) console.error(`GATE FAIL: ${f}`);
process.exit(result.failures.length ? 1 : 0);
