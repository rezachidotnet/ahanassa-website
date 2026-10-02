#!/usr/bin/env python3
"""Generate rfq_intake v1.1 fingerprint test vectors with Python's own json.dumps.

Follows docs/contracts/RFQ_INTAKE_V1_1.md §3 (= Odoo contract §3 and
controllers/rfq_api.py `_validate` + models/rfq.py `canonical_utc`). The
TypeScript mirror (lib/contracts/rfq-intake-v1-1.ts) is tested against the
output: lib/contracts/fixtures/rfq-intake-fingerprint-vectors.json.
Run: /usr/bin/python3 scripts/contracts/rfq-intake-fingerprint-vectors.py > lib/contracts/fixtures/rfq-intake-fingerprint-vectors.json
"""
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone

SHAPE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$", re.I)


def canonical_utc(value):
    m = SHAPE.match(value)
    y, mo, d, h, mi, s, frac, tz = m.groups()
    micro = int((frac or "").ljust(6, "0") or "0")
    if tz.upper() == "Z":
        offset = timedelta(0)
    else:
        sign = -1 if tz[0] == "-" else 1
        offset = sign * timedelta(hours=int(tz[1:3]), minutes=int(tz[4:6]))
    moment = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s), micro, tzinfo=timezone(offset)).astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S") + (f".{moment.microsecond:06d}" if moment.microsecond else "") + "Z"


def normalize(payload):
    n = dict(payload)
    n["locale"] = payload.get("locale", "fa")
    n["customer"] = dict(payload["customer"])
    n["notes"] = payload.get("notes") or ""
    items = []
    for item in payload["items"]:
        out = {**item, "quantity": float(item["quantity"]), "uom": item["uom"].lower()}
        if "length_mm" in item:
            if item["length_mm"] is None:
                out.pop("length_mm")
            else:
                out["length_mm"] = float(item["length_mm"])
        items.append(out)
    n["items"] = items
    if n.get("received_at") is None:
        n.pop("received_at", None)
    else:
        n["received_at"] = canonical_utc(n["received_at"])
    if n.get("website_reference") is None:
        n.pop("website_reference", None)
    return n


BASE = {
    "customer": {"name": "علی رضایی", "company": "Example Co.", "phone": "+989121234567", "email": "a@example.com", "country": "IR", "city": "Tehran"},
    "items": [
        {"product_variant_xid": "CVAR-000123", "sku": "AA-RB-AJ400-D16", "quantity": 12, "uom": "TON", "length_mm": 12000, "notes": ""},
        {"description": "Uncatalogued steel requirement", "quantity": 5.5, "uom": "kg"},
    ],
    "consent": {"contact": True, "privacy_version": "v1"},
    "source": {"utm_source": "website"},
}

CASES = {
    "v1_minimal_defaults": dict(BASE),
    "v1_1_offset": {**BASE, "locale": "en", "notes": "x", "received_at": "2026-10-02T03:41:07+03:30", "website_reference": "AA-RFQ-K3QW9T2H"},
    "v1_1_same_instant_z": {**BASE, "locale": "en", "notes": "x", "received_at": "2026-10-02T00:11:07Z", "website_reference": "AA-RFQ-K3QW9T2H"},
    "v1_1_micros": {**BASE, "received_at": "2026-10-02T00:11:07.123400Z"},
    "nulls_removed": {**BASE, "notes": None, "received_at": None, "website_reference": None,
                      "items": [{"description": "Plate", "quantity": 1e12, "uom": "Sheet", "length_mm": None}]},
    "small_float": {**BASE, "items": [{"description": "Wire", "quantity": 0.00001, "uom": "kg"}]},
}

out = []
for name, payload in CASES.items():
    canonical = json.dumps(normalize(payload), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    out.append({"name": name, "payload": payload, "canonical": canonical, "fingerprint": hashlib.sha256(canonical.encode("utf-8")).hexdigest()})
print(json.dumps(out, ensure_ascii=False, indent=1))
