-- W35: single-use ALTCHA challenges of the domestic intake (lib/rfq-node/altcha.ts). IR-only, never applied to D1.
-- A challenge's HMAC signature is recorded when its solution is accepted; the same signature again is a replay and is
-- refused. Rows are dropped once the challenge has expired (≤ 10 min), when they can no longer verify anyway.
-- Nothing here holds personal data.
CREATE TABLE IF NOT EXISTS ir_captcha_used (
  signature   TEXT PRIMARY KEY,                     -- the challenge's HMAC-SHA-256 signature (hex)
  expires_at  INTEGER NOT NULL                      -- the challenge's own expiresAt (unix seconds)
);
CREATE INDEX IF NOT EXISTS ir_captcha_used_expires ON ir_captcha_used (expires_at);
