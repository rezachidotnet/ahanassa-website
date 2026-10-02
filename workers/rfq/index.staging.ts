/**
 * RFQ Worker — STAGING entry (`env.staging.main`). Same Worker as index.ts
 * plus the staging test routes (crash-after-POST, real-Odoo 401 probe) and the
 * Turnstile test path (TURNSTILE_TEST_MODE=1), which exist only in this bundle.
 */
import { createRfqWorker } from "./app.ts";
import { stagingTestRoutes, stagingTurnstileTestPath } from "./test-routes.ts";

export default createRfqWorker({ adminExtension: stagingTestRoutes, prepareSubmit: stagingTurnstileTestPath });
