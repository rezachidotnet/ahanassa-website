/**
 * Spike S1 — sentinel script for the assets-only static Worker.
 *
 * With no `run_worker_first` and `not_found_handling: "404-page"`, Cloudflare
 * serves every request from Static Assets and should never invoke this
 * script. If it IS invoked, it logs a marker (visible in `wrangler tail`)
 * and fails loudly, so any invocation is impossible to miss.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    console.log("SPIKE_STATIC_WORKER_INVOKED", new URL(request.url).pathname);
    return new Response("static worker invoked (spike sentinel)", { status: 500 });
  },
};
