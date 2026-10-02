/**
 * RFQ Worker — STAGING entry (`env.staging.main`). Same Worker as index.ts
 * plus the staging test routes (crash-after-POST, real-Odoo 401 probe), which
 * exist only in this bundle.
 */
import { createRfqWorker } from "./app.ts";
import { stagingTestRoutes } from "./test-routes.ts";

export default createRfqWorker({ adminExtension: stagingTestRoutes });
