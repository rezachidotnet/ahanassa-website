/**
 * W35 Docker rehearsal: what the browser widget does, for curl — reads an ALTCHA challenge (the JSON of
 * GET /api/rfqs/captcha-challenge) on stdin, solves it with altcha-lib (the same PBKDF2 proof of work the widget's worker
 * runs), prints the payload the form sends as `turnstileToken`. Bundled on the host by p2-prep.ts (no npm in the box).
 *
 *   curl … /api/rfqs/captcha-challenge | node altcha-solve.mjs
 */
import { solveChallenge, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

const chunks: Buffer[] = [];
for await (const c of process.stdin) chunks.push(c as Buffer);
const challenge = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Challenge;
const solution = await solveChallenge({ challenge, deriveKey });
if (!solution) process.exit(1);
process.stdout.write(Buffer.from(JSON.stringify({ challenge: { parameters: challenge.parameters, signature: challenge.signature }, solution })).toString("base64"));
