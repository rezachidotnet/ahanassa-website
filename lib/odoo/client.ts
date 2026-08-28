/**
 * Generic Odoo External API (JSON-2) HTTP client — protocol mechanics only.
 * This implements the publicly documented Odoo JSON-2 request shape
 * (Bearer API key, `{model, method, args, kwargs}` envelope per
 * 01-sources/TECHNICAL_ARCHITECTURE.md §14.2), not anything specific to
 * this project's unresolved model mapping. It is never called with a
 * concrete model/method by lib/odoo/adapter.ts in this task — see that
 * file for why (DAR-013: Odoo version/modules/field mapping remain a
 * genuine, unresolved discovery gate, not something to guess).
 */

export interface OdooClientConfig {
  baseUrl: string;
  database: string;
  apiKey: string;
}

export interface OdooCallParams {
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

export class OdooRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCategory: "4xx" | "5xx" | "network_error",
  ) {
    super(message);
  }
}

/** Real request mechanics, deliberately unused (see file header) until a concrete model mapping is approved. */
export async function callOdoo(config: OdooClientConfig, params: OdooCallParams, timeoutMs = 10_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/api/v2/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Odoo-Database": config.database,
      },
      body: JSON.stringify({
        model: params.model,
        method: params.method,
        args: params.args ?? [],
        kwargs: params.kwargs ?? {},
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const category = response.status >= 500 ? "5xx" : "4xx";
      throw new OdooRequestError(`Odoo request failed with status ${response.status}`, category);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof OdooRequestError) throw err;
    throw new OdooRequestError("Odoo request network error", "network_error");
  } finally {
    clearTimeout(timeout);
  }
}
