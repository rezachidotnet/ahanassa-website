import { test } from "node:test";
import assert from "node:assert/strict";
import { reasonCodeForStage, safeErrorMessage } from "./failure-reason.ts";
import { ProviderNotConfiguredError } from "./provider.ts";

test("get_db stage always maps to database_unavailable", () => {
  assert.equal(reasonCodeForStage("get_db", new Error("boom")), "database_unavailable");
});

test("registry_lookup stage maps to unknown_provider_failure", () => {
  assert.equal(reasonCodeForStage("registry_lookup", new Error("not found")), "unknown_provider_failure");
});

test("config_resolution stage maps to provider_configuration_error", () => {
  assert.equal(reasonCodeForStage("config_resolution", new Error("bad config")), "provider_configuration_error");
});

test("lease_acquisition stage maps to lease_acquisition_failed", () => {
  assert.equal(reasonCodeForStage("lease_acquisition", new Error("db error")), "lease_acquisition_failed");
});

test("provider_fetch stage maps ProviderNotConfiguredError to provider_not_configured", () => {
  assert.equal(reasonCodeForStage("provider_fetch", new ProviderNotConfiguredError("odoo", "no price api")), "provider_not_configured");
});

test("provider_fetch stage maps a generic error to provider_unavailable", () => {
  assert.equal(reasonCodeForStage("provider_fetch", new Error("network down")), "provider_unavailable");
});

test("provider_fetch stage maps a TimeoutError/AbortError to provider_timeout", () => {
  const timeout = new Error("timed out");
  timeout.name = "TimeoutError";
  assert.equal(reasonCodeForStage("provider_fetch", timeout), "provider_timeout");

  const aborted = new Error("aborted");
  aborted.name = "AbortError";
  assert.equal(reasonCodeForStage("provider_fetch", aborted), "provider_timeout");
});

test("normalize_map stage maps to critical_normalization_failure", () => {
  assert.equal(reasonCodeForStage("normalize_map", new Error("bad data")), "critical_normalization_failure");
});

test("persistence stage maps to persistence_failed", () => {
  assert.equal(reasonCodeForStage("persistence", new Error("D1 write error")), "persistence_failed");
});

test("record_outcome stage maps to persistence_failed", () => {
  assert.equal(reasonCodeForStage("record_outcome", new Error("D1 write error")), "persistence_failed");
});

test("safeErrorMessage extracts only a short scalar string, never the raw error object", () => {
  const message = safeErrorMessage(new Error("a".repeat(1000)));
  assert.equal(typeof message, "string");
  assert.ok(message.length <= 300);
});

test("safeErrorMessage handles a non-Error thrown value without throwing itself", () => {
  assert.doesNotThrow(() => safeErrorMessage("a plain string throw"));
  assert.doesNotThrow(() => safeErrorMessage({ some: "object" }));
  assert.doesNotThrow(() => safeErrorMessage(undefined));
});
