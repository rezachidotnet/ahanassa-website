import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCatalogSyncHealth } from "./sync-health.ts";

test("evaluateCatalogSyncHealth: never-succeeded state is unhealthy", () => {
  const health = evaluateCatalogSyncHealth({ lastSuccessAt: null, consecutiveFailureCount: 0, lastFailureReasonCode: null }, Date.now());
  assert.equal(health.isHealthy, false);
  assert.equal(health.ageSinceSuccessMs, null);
});

test("evaluateCatalogSyncHealth: a recent success with zero failures is healthy", () => {
  const now = Date.now();
  const lastSuccessAt = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
  const health = evaluateCatalogSyncHealth({ lastSuccessAt, consecutiveFailureCount: 0, lastFailureReasonCode: null }, now);
  assert.equal(health.isHealthy, true);
});

test("evaluateCatalogSyncHealth: a success older than 24h is unhealthy (stale)", () => {
  const now = Date.now();
  const lastSuccessAt = new Date(now - 25 * 60 * 60 * 1000).toISOString();
  const health = evaluateCatalogSyncHealth({ lastSuccessAt, consecutiveFailureCount: 0, lastFailureReasonCode: null }, now);
  assert.equal(health.isHealthy, false);
});

test("evaluateCatalogSyncHealth: 3+ consecutive failures is unhealthy even with a recent success timestamp", () => {
  const now = Date.now();
  const lastSuccessAt = new Date(now - 60 * 1000).toISOString();
  const health = evaluateCatalogSyncHealth({ lastSuccessAt, consecutiveFailureCount: 3, lastFailureReasonCode: "CATALOG_SYNC_LIST_FAILED" }, now);
  assert.equal(health.isHealthy, false);
});

test("evaluateCatalogSyncHealth: 1-2 consecutive failures alone do not flip healthy to false", () => {
  const now = Date.now();
  const lastSuccessAt = new Date(now - 60 * 1000).toISOString();
  const health = evaluateCatalogSyncHealth({ lastSuccessAt, consecutiveFailureCount: 2, lastFailureReasonCode: "CATALOG_SYNC_LIST_FAILED" }, now);
  assert.equal(health.isHealthy, true);
});
