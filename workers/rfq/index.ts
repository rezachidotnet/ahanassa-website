/**
 * RFQ Worker — PRODUCTION entry (top-level `main` in wrangler.jsonc). No test
 * routes or hooks are imported here, so none are compiled into this bundle;
 * lib/rfq-worker/bundle-scan.test.ts proves it. Routes: see app.ts.
 */
import { createRfqWorker } from "./app.ts";

export default createRfqWorker();
