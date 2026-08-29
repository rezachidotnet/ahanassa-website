/**
 * Odoo External API (JSON-2) HTTP client — protocol mechanics only.
 *
 * Verified 2026-08-28 (DAR-026) directly against the live `ahanassa`
 * database's Odoo 19.0-20260528 instance — not assumed from generic Odoo
 * documentation. Prior revisions of this file guessed a `/api/v2/call`
 * envelope; that guess was WRONG and has been replaced with the real,
 * source-verified contract:
 *
 *   - Route: `POST /json/2/<model>/<method>` (odoo/addons/rpc, module
 *     `rpc`, confirmed `installed` in `ahanassa`; `odoo/addons/rpc/controllers/json2.py`
 *     `WebJson2Controller.web_json_2_rpc`).
 *   - Auth: `Authorization: Bearer <api key>` (`auth='bearer'` on the
 *     route). Bearer keys are Odoo's native `res.users.apikeys` records,
 *     scoped to one user in one database — there is no separate database
 *     header/field in the request. `ODOO_DATABASE` is still required by
 *     `lib/env.ts#getOdooConfig` as a deployment-configuration safety net
 *     (documents which tenant a given secret is scoped to; this Odoo host
 *     serves several unrelated tenant databases behind the same reverse
 *     proxy) — it is not sent over the wire.
 *   - Request body: plain JSON — `{ ids？: number[], context?: object,
 *     ...methodKwargs }`. NOT a `{model, method, args, kwargs}` envelope
 *     and NOT JSON-RPC 2.0 — `Json2Dispatcher.dispatch` (odoo/http.py)
 *     calls the target method as `func(records, **kwargs)`, so ORM
 *     model-level methods (`create`, `search_read`, ...) receive their
 *     keyword arguments directly as top-level JSON keys, keyed by the
 *     target method's own Python parameter names (e.g. `create` takes
 *     `vals_list`; `search_read` takes `domain`/`fields`).
 *   - Response body (success): the plain JSON return value of the called
 *     method — no `{jsonrpc, result}` wrapper (that envelope belongs to
 *     the legacy `/jsonrpc` `JsonRPCDispatcher`, a different class).
 *   - Response body (error): `Json2Dispatcher.handle_error` returns the
 *     real HTTP status of the underlying exception (`UserError`/
 *     `SessionExpiredException` → `exc.http_status`; other
 *     `HTTPException`s → `exc.code`; anything else → 500) with a
 *     `serialize_exception(...)` JSON body. This client classifies by
 *     status code only and never stores/forwards that body — matching
 *     `01-sources/TECHNICAL_ARCHITECTURE.md` §14.4/§23 ("never a raw
 *     provider error body").
 *
 * See lib/odoo/mapping.ts for the model/field mapping this transport is
 * used with, and lib/odoo/adapter.ts for why a real API key is still
 * required before any of this executes for real.
 */

export interface OdooClientConfig {
  baseUrl: string;
  /** Not sent on the wire (see file header) — kept for config-safety documentation only. */
  database: string;
  apiKey: string;
}

export interface OdooCallParams {
  model: string;
  method: string;
  /** Target record IDs, when the method operates on an existing recordset (e.g. `write`). Omit/empty for model-level calls (`create`, `search_read`). */
  ids?: number[];
  /** Keyword arguments matching the target Python method's own parameter names — see file header. */
  kwargs?: Record<string, unknown>;
  /**
   * Odoo environment context (e.g. `{ active_test: false }` to include
   * archived/inactive records in a search) — a top-level protocol field
   * per the file header, distinct from `kwargs`. Omitted entirely when not
   * needed, matching every existing call site's prior behavior exactly.
   */
  context?: Record<string, unknown>;
}

export class OdooRequestError extends Error {
  readonly statusCategory: "4xx" | "5xx" | "network_error";
  readonly httpStatus?: number;

  constructor(message: string, statusCategory: "4xx" | "5xx" | "network_error", httpStatus?: number) {
    super(message);
    this.statusCategory = statusCategory;
    this.httpStatus = httpStatus;
  }
}

export async function callOdoo(config: OdooClientConfig, params: OdooCallParams, timeoutMs = 10_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${config.baseUrl.replace(/\/+$/, "")}/json/2/${params.model}/${params.method}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        ids: params.ids ?? [],
        ...(params.context ? { context: params.context } : {}),
        ...(params.kwargs ?? {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const category = response.status >= 500 ? "5xx" : "4xx";
      throw new OdooRequestError(`Odoo request failed with status ${response.status}`, category, response.status);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof OdooRequestError) throw err;
    throw new OdooRequestError("Odoo request network error", "network_error");
  } finally {
    clearTimeout(timeout);
  }
}
