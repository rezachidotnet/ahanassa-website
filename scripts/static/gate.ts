/** Re-runs the artifact.v1 gate on an existing artifact: `npm run static:gate -- <artifactDir>` (default .artifact). */
import path from "node:path";
import { runArtifactGate } from "../../lib/static/artifact-gate.ts";
import { COMPANY_PUBLIC_NUMBERS } from "../../lib/content/contact-channels.ts";

const dir = path.resolve(process.argv[2] ?? ".artifact");
const result = runArtifactGate(dir, { companyPhones: COMPANY_PUBLIC_NUMBERS });
console.log(JSON.stringify(result.stats));
for (const f of result.failures) console.error(`GATE FAIL: ${f}`);
process.exit(result.failures.length ? 1 : 0);
