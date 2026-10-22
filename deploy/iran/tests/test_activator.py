"""W30 activator + sync agent tests (Python 3 stdlib unittest; needs ssh-keygen with -Y sign/verify).

    python3 -m unittest discover -s deploy/iran/tests -v

Every refusal case asserts the same thing: the activation is refused, the reason is recorded, and `current` still
points at the release that was serving before (nothing half-switched).
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "lib"))
import ahanassa_iran as ai  # noqa: E402

CODE_SHA = "0123456789abcdef0123456789abcdef01234567"
CHUNK = "_next/static/chunks/main-AbC123.js"


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def keypair(d: str, name: str) -> tuple[str, str]:
    key = os.path.join(d, name)
    subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", name, "-f", key], check=True)
    with open(key + ".pub") as f:
        return key, f.read().strip()


def sign(key: str, data: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "activation.json")
        with open(p, "wb") as f:
            f.write(data)
        subprocess.run(["ssh-keygen", "-Y", "sign", "-q", "-f", key, "-n", ai.SIGNING_NAMESPACE, p], check=True, capture_output=True)
        with open(p + ".sig", "rb") as f:
            return f.read()


def public_files(snapshot: str, marker: str = "") -> dict[str, bytes]:
    page = lambda t: f"<!DOCTYPE html><html><body>{t}{marker}{' ' * 300}</body></html>".encode()  # noqa: E731 - >256 B: precompressed
    return {
        "index.html": page("home"),
        "contact.html": page("contact"),
        "en.html": page("en"),
        "404.html": page("404"),
        "en/404.html": page("en 404"),
        "manifest.public.json": json.dumps({"schema_version": "artifact.public.v1", "snapshot_version": snapshot}).encode(),
        CHUNK: b"console.log(1)",
        "_headers": b"/*\n  X-Frame-Options: DENY\n",
        "_redirects": b"/fa / 308\n/fa/* /:splat 308\n",
    }


NGINX = {
    "redirects-301.map": "",
    "redirects-302.map": '"/en/prices" "/en/products";\n',
    "redirects-307.map": "",
    "redirects-308.map": '"/fa" "/";\n"~^/fa/(.*)$" "/$1";\n',
    "cache-control.map": f'"/{CHUNK}" "public, max-age=31536000, immutable";\n',
    "robots.map": '"~^/data/" "noindex";\n',
    "notfound.map": '"~^/en/" "/en/404.html";\n',
    "headers.conf": 'add_header X-Frame-Options "DENY" always;\n',
}


def make_bundle(path: str, env: str, snapshot: str, *, marker: str = "", extra: dict | None = None, drop: str | None = None, swap: dict | None = None, nginx: dict | None = None, symlink: str | None = None, rfq: bytes | None = None, rfq_name: str = "rfq-ir.mjs") -> tuple[bytes, str]:
    """A bundle zip exactly as scripts/iran/bundle.ts lays it out. Returns (manifest bytes, bundle sha256)."""
    pub = public_files(snapshot, marker)
    priv = {"rfq-variant-index.json": json.dumps({"snapshot_version": snapshot, "rows": []}).encode()}
    ng = {**NGINX, **(nginx or {})}
    manifest = json.dumps({
        "schema_version": "artifact.v1", "code_sha": CODE_SHA, "snapshot_version": snapshot, "environment": env,
        "generated_at": "2026-10-22T00:00:00Z", "counts": {},
        "public_assets": [{"path": p, "bytes": len(b), "sha256": sha(b)} for p, b in sorted(pub.items())],
        "private_snapshot": [{"path": p, "bytes": len(b), "sha256": sha(b)} for p, b in priv.items()],
    }).encode()
    bj = {"schema": ai.BUNDLE_SCHEMA, "manifest_sha256": sha(manifest), "nginx": [{"path": n, "bytes": len(t.encode()), "sha256": sha(t.encode())} for n, t in ng.items()]}
    if rfq is not None:
        bj["rfq"] = [{"path": rfq_name, "bytes": len(rfq), "sha256": sha(rfq)}]
    bundle_json = json.dumps(bj).encode()
    entries = {"bundle.json": bundle_json, "manifest.json": manifest, **{f"nginx/{n}": t.encode() for n, t in ng.items()}, **{f"private/{p}": b for p, b in priv.items()}, **{f"public/{p}": b for p, b in pub.items()}}
    if rfq is not None:
        entries[f"rfq/{rfq_name}"] = rfq
    entries.update(swap or {})
    entries.update(extra or {})
    if drop:
        entries.pop(drop)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in entries.items():
            zf.writestr(name, data)
        if symlink:
            info = zipfile.ZipInfo(symlink)
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            zf.writestr(info, "/etc/passwd")
    with open(path, "rb") as f:
        return manifest, sha(f.read())


class FakeServer:
    """Answers like the nginx site templates would, from whatever `current` points at right now."""

    def __init__(self, current: str):
        self.current, self.fail = current, None

    def __call__(self, path: str):
        if self.fail and path == self.fail:
            return 500, {}, b""
        pub = os.path.join(os.path.realpath(self.current), "public")
        if path.startswith("/fa/"):
            return 308, {"location": path[3:]}, b""
        f = os.path.join(pub, "index.html" if path == "/" else path.lstrip("/"))
        for cand in (f, f + ".html"):
            if os.path.isfile(cand):
                cc = ai.IMMUTABLE_CACHE_CONTROL if "/_next/static/" in path else ai.DEFAULT_CACHE_CONTROL
                return 200, {"cache-control": cc}, ai.read_bytes(cand)
        return 404, {"cache-control": ai.DEFAULT_CACHE_CONTROL}, b"404"


class Base(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix="w30-act-")
        self.addCleanup(shutil.rmtree, self.d, True)
        keys = os.path.join(self.d, "keys")
        os.makedirs(keys)
        self.key, pub = keypair(keys, "ci-production")
        self.staging_key, spub = keypair(keys, "ci-staging")
        self.other_key, _ = keypair(keys, "other")
        signers = os.path.join(self.d, "allowed_signers")
        with open(signers, "w") as f:
            f.write(f'ci-production namespaces="{ai.SIGNING_NAMESPACE}" {pub}\nci-staging namespaces="{ai.SIGNING_NAMESPACE}" {spub}\n')
        self.nginx_rc = os.path.join(self.d, "nginx-rc")
        self.calls = os.path.join(self.d, "calls")
        fake = os.path.join(self.d, "fake-nginx")
        with open(fake, "w") as f:
            f.write(f'#!/bin/sh\necho "$*" >> {self.calls}\nrc=0\ncase "$*" in *nginx-candidate.conf*) [ -f {self.nginx_rc}.candidate ] && rc=$(cat {self.nginx_rc}.candidate) ;; *) [ -f {self.nginx_rc}.live ] && rc=$(cat {self.nginx_rc}.live) ;; esac\nexit $rc\n')
        os.chmod(fake, 0o755)
        self.cfg = ai.load_config(None)
        self.cfg.update(root=os.path.join(self.d, "srv"), allowed_signers=signers, hold_dir=os.path.join(self.d, "etc"), nginx=fake, nginx_reload=[fake, "-s", "reload"], brotli="no-brotli-here", keep_releases=3, smoke_wait_seconds=0)
        os.makedirs(self.cfg["hold_dir"])
        self.p = ai.env_paths(self.cfg, "production")
        ai.bootstrap(self.cfg, "production")
        self.server = FakeServer(self.p["current"])
        self.seq = 1_700_000_000_000

    # helpers -----------------------------------------------------------------------------------------------------
    def offer(self, *, env="production", key=None, seq=None, snapshot="snap-aaaa0001", tamper_zip=False, activation_patch=None, with_bundle=True, reason="publish", **bundle_kw):
        self.seq = seq or self.seq + 1000
        inc = os.path.join(self.cfg["root"], "incoming", env, str(self.seq))
        os.makedirs(inc, exist_ok=True)
        zpath = os.path.join(inc, "bundle.zip")
        manifest, bsha = make_bundle(zpath, env, snapshot, **bundle_kw)
        a = {"schema": ai.ACTIVATION_SCHEMA, "env": env, "seq": self.seq, "reason": reason, "run_id": 42, "code_sha": CODE_SHA, "snapshot_version": snapshot, "manifest_sha256": sha(manifest), "bundle_sha256": bsha, "bundle_bytes": os.path.getsize(zpath), "bundle_artifact": f"iran-bundle-{env}-{snapshot}", "created_at": "2026-10-22T12:00:00Z"}
        a.update(activation_patch or {})
        if tamper_zip:
            with open(zpath, "r+b") as f:
                f.seek(-30, os.SEEK_END)
                f.write(b"X")
        if not with_bundle:
            os.unlink(zpath)
        raw = json.dumps(a).encode()
        with open(os.path.join(inc, "activation.json"), "wb") as f:
            f.write(raw)
        with open(os.path.join(inc, "activation.json.sig"), "wb") as f:
            f.write(sign(key or (self.staging_key if env == "staging" else self.key), raw))
        open(os.path.join(self.cfg["root"], "incoming", env, f"{self.seq}.ready"), "w").close()
        return a

    def activate(self, env="production"):
        return ai.activate(self.cfg, env, fetch=self.server)

    def current(self):
        return os.path.basename(os.readlink(self.p["current"]))

    def state(self):
        return ai.read_json(self.p["state"])

    def assert_refused(self, pattern: str, keep: str):
        self.assertEqual(self.activate(), 1)
        self.assertEqual(self.current(), keep)
        self.assertRegex(self.state()["last_refused"]["reason"], pattern)
        self.assertEqual(ai.pending(self.p), [], "the refused .ready is consumed (no retrigger loop)")
        self.assertFalse([n for n in os.listdir(self.p["releases"]) if n.startswith(".tmp-")], "no half-unpacked release left")


class ActivateTests(Base):
    def good(self, **kw):
        a = self.offer(**kw)
        self.assertEqual(self.activate(), 0, self.state().get("last_error"))
        return a

    def test_happy_path(self):
        a = self.good()
        rid = f"snap-aaaa0001-{CODE_SHA[:12]}-{a['seq']}"
        self.assertEqual(self.current(), rid)
        rel = os.path.join(self.p["releases"], rid)
        self.assertEqual(ai.read_bytes(os.path.join(rel, "public", "index.html")), public_files("snap-aaaa0001")["index.html"])
        self.assertTrue(os.path.exists(os.path.join(rel, "public", "index.html.gz")), "text assets are precompressed")
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(rel, "private", "rfq-variant-index.json")).st_mode), 0o640)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(rel, "private")).st_mode), 0o750)
        st = self.state()
        self.assertEqual(st["last_seq"], a["seq"])
        status = ai.read_json(self.p["status"])
        self.assertEqual(status["snapshot_version"], "snap-aaaa0001")
        self.assertIn(a["bundle_sha256"], status["bundles"])
        self.assertEqual(stat.S_IMODE(os.stat(self.p["state"]).st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(os.stat(self.p["status"]).st_mode), 0o644)
        with open(self.calls) as f:
            calls = f.read()
        self.assertIn("nginx-candidate.conf", calls)
        self.assertIn("-s reload", calls)

    def test_second_release_hardlinks_unchanged_files(self):
        self.good()
        first = self.current()
        self.good(snapshot="snap-aaaa0002", marker="v2")
        second = self.current()
        a = os.stat(os.path.join(self.p["releases"], first, "public", CHUNK))
        b = os.stat(os.path.join(self.p["releases"], second, "public", CHUNK))
        self.assertEqual(a.st_ino, b.st_ino, "an unchanged file is one inode")
        self.assertNotEqual(os.stat(os.path.join(self.p["releases"], first, "public", "index.html")).st_ino, os.stat(os.path.join(self.p["releases"], second, "public", "index.html")).st_ino)
        self.assertEqual(os.path.basename(os.readlink(self.p["previous"])), first)

    def test_tampered_zip(self):
        self.offer(tamper_zip=True)
        self.assert_refused("sha256 differs from the signed activation", "bootstrap")

    def test_tampered_member_signed_anyway(self):
        # CI signed a bundle whose public file no longer matches the artifact manifest.
        self.offer(swap={"public/index.html": b"<html>defaced</html>"})
        self.assert_refused("public/index.html does not match", "bootstrap")

    def test_extra_file(self):
        self.offer(extra={"public/evil.php": b"<?php"})
        self.assert_refused("not in manifest.json/bundle.json, e.g. public/evil.php", "bootstrap")

    def test_extra_nginx_file(self):
        self.offer(extra={"nginx/evil.conf": b"proxy_pass http://x;"})
        self.assert_refused("not in manifest.json/bundle.json", "bootstrap")

    def test_missing_file(self):
        self.offer(drop="public/contact.html")
        self.assert_refused("missing, e.g. public/contact.html", "bootstrap")

    def test_unsafe_names_and_symlinks(self):
        self.offer(extra={"../escape": b"x"})
        self.assert_refused("unsafe entry name", "bootstrap")
        self.offer(symlink="public/link")
        self.assert_refused("not a regular file", "bootstrap")

    def test_bad_signature(self):
        self.offer(key=self.other_key)
        self.assert_refused("signature: not valid for ci-production", "bootstrap")

    def test_staging_key_cannot_activate_production(self):
        self.offer(key=self.staging_key)
        self.assert_refused("signature: not valid for ci-production", "bootstrap")

    def test_old_seq(self):
        a = self.good()
        keep = self.current()
        self.offer(seq=a["seq"], snapshot="snap-aaaa0002")
        self.assert_refused("not newer than the last applied", keep)
        self.offer(seq=a["seq"] - 5, snapshot="snap-aaaa0002")
        self.assert_refused("not newer than the last applied", keep)

    def test_activation_for_other_env_or_manifest(self):
        self.offer(activation_patch={"manifest_sha256": "0" * 64})
        self.assert_refused("manifest.json sha256 differs", "bootstrap")
        self.offer(activation_patch={"snapshot_version": "snap-other0001"})
        self.assert_refused("snapshot_version", "bootstrap")
        self.offer(activation_patch={"extra": 1})
        self.assert_refused("keys differ", "bootstrap")

    def test_grammar_violation_inside_a_consistent_bundle(self):
        self.offer(nginx={"headers.conf": "proxy_pass http://127.0.0.1:1;\n"})
        self.assert_refused("nginx include grammar", "bootstrap")

    def test_nginx_t_fails_on_candidate(self):
        good = self.good()
        keep = self.current()
        open(self.nginx_rc + ".candidate", "w").write("1")
        self.offer(snapshot="snap-aaaa0002")
        self.assert_refused("nginx -t \\(candidate includes\\) failed", keep)
        self.assertTrue(good)

    def test_live_nginx_t_fails_after_switch_restores(self):
        self.good()
        keep = self.current()
        open(self.nginx_rc + ".live", "w").write("1")
        self.offer(snapshot="snap-aaaa0002")
        self.assertEqual(self.activate(), 1)
        self.assertEqual(self.current(), keep)

    def test_smoke_fail_switches_back(self):
        self.good()
        keep = self.current()
        self.server.fail = "/manifest.public.json"
        self.offer(snapshot="snap-aaaa0002", marker="v2")
        self.assert_refused("smoke: /manifest.public.json -> 500", keep)
        with open(self.calls) as f:
            self.assertGreaterEqual(f.read().count("-s reload"), 3, "reloaded for the candidate, then again for the restore")

    def test_hold(self):
        open(os.path.join(self.cfg["hold_dir"], "hold-production"), "w").close()
        self.offer()
        self.assert_refused("held", "bootstrap")

    def test_rollback_reuses_a_local_release_without_download(self):
        a1 = self.good()
        first = self.current()
        self.good(snapshot="snap-aaaa0002", marker="v2")
        rb = self.offer(seq=self.seq + 1000, snapshot="snap-aaaa0001", reason="rollback", with_bundle=False)
        self.assertEqual(rb["bundle_sha256"], a1["bundle_sha256"], "same bundle bytes")
        self.assertEqual(self.activate(), 0, self.state().get("last_error"))
        self.assertEqual(self.current(), first)
        self.assertEqual(self.state()["last_seq"], rb["seq"])

    def test_bundle_missing_and_not_local(self):
        self.offer(with_bundle=False)
        self.assert_refused("not delivered and not on the server", "bootstrap")

    def test_prune_keeps_current_previous_and_n(self):
        for i in range(6):
            self.good(snapshot=f"snap-aaaa000{i}", marker=str(i))
        rels = [n for n in os.listdir(self.p["releases"]) if n.startswith("snap-")]
        self.assertEqual(len(rels), 3)
        self.assertIn(self.current(), rels)
        self.assertIn(os.path.basename(os.readlink(self.p["previous"])), rels)

    def test_local_rollback(self):
        self.good()
        first = self.current()
        self.good(snapshot="snap-aaaa0002", marker="v2")
        self.assertEqual(ai.local_rollback(self.cfg, "production", fetch=self.server), 0)
        self.assertEqual(self.current(), first)


class CurlFetcherTests(unittest.TestCase):
    def test_parses_crlf_headers_and_status(self):
        # Regression (found by the Docker rehearsal): curl -D writes CRLF lines; the parser must not depend on them.
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        fake = os.path.join(d, "curl")
        with open(fake, "w") as f:
            f.write('#!/bin/sh\nwhile [ $# -gt 0 ]; do case "$1" in -D) h=$2; shift;; -o) o=$2; shift;; esac; shift; done\n'
                    'printf "HTTP/2 200 \\r\\ncache-control: public, max-age=31536000, immutable\\r\\nX-Robots-Tag: noindex\\r\\n\\r\\n" > "$h"\nprintf body > "$o"\nprintf 200\n')
        os.chmod(fake, 0o755)
        status, headers, body = ai.CurlFetcher({"curl": fake}, "new.ahanassa.ir")("/x")
        self.assertEqual((status, body), (200, b"body"))
        self.assertEqual(headers["cache-control"], "public, max-age=31536000, immutable")
        self.assertEqual(headers["x-robots-tag"], "noindex")


class ArvanCheckTests(unittest.TestCase):
    def test_unchanged_changed_and_no_trailing_newline(self):
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        snap = os.path.join(d, "arvan-edge-v4.txt")
        with open(snap, "w") as f:
            f.write("185.143.232.0/22\n94.101.182.0/27\n")
        cfg = ai.load_config(None)
        self.assertEqual(ai.arvan_check(cfg, snap, fetch=lambda: "94.101.182.0/27\n185.143.232.0/22"), 0)
        self.assertEqual(ai.arvan_check(cfg, snap, fetch=lambda: "94.101.182.0/27\n185.143.232.0/22\n2.144.3.128/28"), 1)
        self.assertEqual(ai.arvan_check(cfg, snap, fetch=lambda: "not a cidr"), 2)


class GrammarTests(unittest.TestCase):
    def test_shared_cases(self):
        with open(os.path.join(HERE, "grammar-cases.json"), encoding="utf-8") as f:
            cases = json.load(f)
        for name, line in cases["accept"]:
            self.assertEqual(ai.check_nginx_include(name, line + "\n"), [], f"{name}: {line}")
        for name, line, why in cases["reject"]:
            self.assertNotEqual(ai.check_nginx_include(name, line + "\n"), [], f"{name}: {line} ({why})")


class SigV4Tests(unittest.TestCase):
    def test_aws_documented_example(self):
        # AWS Signature V4 documentation, "GET Object" example (examplebucket / test.txt / Range bytes=0-9).
        h = ai.s3_signed_headers(
            "GET", "https://examplebucket.s3.amazonaws.com/test.txt", "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "us-east-1",
            now=dt.datetime(2013, 5, 24, tzinfo=dt.timezone.utc), extra={"Range": "bytes=0-9"},
        )
        self.assertEqual(h["Authorization"], "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41")


class FakeSource:
    def __init__(self, name, activation=None, bundle=None, fail=False):
        self.name, self.act, self.bun, self.fail = name, activation, bundle, fail
        self.bundle_calls = 0

    def activation(self, env):
        if self.fail or not self.act:
            raise OSError("filtered")
        return self.act

    def bundle(self, a, dest):
        self.bundle_calls += 1
        if not self.bun:
            raise OSError("no bundle here")
        shutil.copy(self.bun, dest)


class SyncTests(Base):
    def signed(self, seq, key=None, snapshot="snap-aaaa0001"):
        z = os.path.join(self.d, f"b{seq}.zip")
        manifest, bsha = make_bundle(z, "production", snapshot, marker=str(seq))
        a = {"schema": ai.ACTIVATION_SCHEMA, "env": "production", "seq": seq, "reason": "publish", "run_id": 7, "code_sha": CODE_SHA, "snapshot_version": snapshot, "manifest_sha256": sha(manifest), "bundle_sha256": bsha, "bundle_bytes": os.path.getsize(z), "bundle_artifact": f"iran-bundle-production-{snapshot}", "created_at": "2026-10-22T12:00:00Z"}
        raw = json.dumps(a).encode()
        return (raw, sign(key or self.key, raw), {}), z, a

    def test_newest_valid_activation_wins_and_bundle_falls_back_in_order(self):
        old, old_zip, _ = self.signed(100)
        new, new_zip, a = self.signed(200)
        forged, _, _ = self.signed(300, key=self.other_key)
        github = FakeSource("github", activation=old, bundle=None)  # GitHub: older activation, bundle unavailable
        r2 = FakeSource("r2", activation=new, bundle=new_zip)
        bad = FakeSource("evil", activation=forged, bundle=new_zip)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[github, bad, r2]), 0)
        inc = self.p["incoming"]
        self.assertTrue(os.path.exists(os.path.join(inc, "200.ready")))
        self.assertFalse(os.path.exists(os.path.join(inc, "300.ready")), "a forged seq is ignored")
        self.assertEqual(github.bundle_calls, 1, "the primary is tried first for the bundle too")
        self.assertEqual(ai.sha256_file(os.path.join(inc, "200", "bundle.zip")), a["bundle_sha256"])
        # ... and the activator accepts what the agent handed over.
        self.assertEqual(self.activate(), 0, self.state().get("last_error"))

    def test_github_filtered_mirror_serves(self):
        act, z, _ = self.signed(200)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[FakeSource("github", fail=True), FakeSource("r2", activation=act, bundle=z)]), 0)
        self.assertTrue(os.path.exists(os.path.join(self.p["incoming"], "200.ready")))

    def test_wrong_bundle_bytes_from_a_source_are_rejected(self):
        act, _, _ = self.signed(200)
        _, other_zip, _ = self.signed(201)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[FakeSource("r2", activation=act, bundle=other_zip)]), 3)
        self.assertEqual(ai.pending(self.p), [])

    def test_up_to_date_and_full_cutoff(self):
        act, z, _ = self.signed(200)
        src = FakeSource("github", activation=act, bundle=z)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[src]), 0)
        self.assertEqual(self.activate(), 0)
        before = self.current()
        self.assertEqual(ai.sync(self.cfg, "production", sources=[src]), 0)
        self.assertEqual(ai.pending(self.p), [], "nothing new: nothing handed over")
        # Cutoff: every source unreachable -> no change, the last good copy stays.
        self.assertEqual(ai.sync(self.cfg, "production", sources=[FakeSource("github", fail=True), FakeSource("r2", fail=True)]), 2)
        self.assertEqual(self.current(), before)

    def test_bundle_already_local_is_not_downloaded(self):
        act, z, _ = self.signed(200)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[FakeSource("github", activation=act, bundle=z)]), 0)
        self.assertEqual(self.activate(), 0)
        a = json.loads(act[0])
        a.update(seq=300, reason="rollback")
        raw = json.dumps(a).encode()
        src = FakeSource("github", activation=(raw, sign(self.key, raw), {}), bundle=z)
        self.assertEqual(ai.sync(self.cfg, "production", sources=[src]), 0)
        self.assertEqual(src.bundle_calls, 0)
        self.assertFalse(os.path.exists(os.path.join(self.p["incoming"], "300", "bundle.zip")))



class RfqServiceTests(Base):
    """W32: the domestic RFQ intake ships in the same signed bundle (rfq/rfq-ir.mjs) and follows `current`."""

    def setUp(self):
        super().setUp()
        self.sysctl_rc = os.path.join(self.d, "systemctl-rc")
        fake = os.path.join(self.d, "fake-systemctl")
        with open(fake, "w") as f:
            f.write(f'#!/bin/sh\necho "systemctl $*" >> {self.calls}\n[ -f {self.sysctl_rc} ] && exit $(cat {self.sysctl_rc})\nexit 0\n')
        os.chmod(fake, 0o755)
        self.cfg["systemctl"] = fake
        self.cfg["envs"]["production"]["rfq"] = {"enabled": True, "port": 8711, "wait_seconds": 0}
        self.healthy = True

    def probe(self, cfg, env):
        return self.healthy

    def run_activate(self):
        return ai.activate(self.cfg, "production", fetch=self.server, rfq_check=self.probe)

    def systemctl_calls(self):
        with open(self.calls) as f:
            return [l.strip() for l in f if l.startswith("systemctl")]

    def test_first_release_restarts_both_units_then_unchanged_code_only_reloads_the_index(self):
        self.offer(rfq=b"// v1")
        self.assertEqual(self.run_activate(), 0, self.state().get("last_error"))
        rel = os.path.join(self.p["releases"], self.current())
        self.assertEqual(ai.read_bytes(os.path.join(rel, "rfq", "rfq-ir.mjs")), b"// v1")
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(rel, "rfq", "rfq-ir.mjs")).st_mode), 0o644)
        self.assertEqual(self.systemctl_calls(), ["systemctl restart ahanassa-rfq@production.service ahanassa-rfq-forward@production.service"])
        self.offer(rfq=b"// v1", snapshot="snap-aaaa0002", marker="v2")
        self.assertEqual(self.run_activate(), 0)
        self.assertEqual(self.systemctl_calls()[-1], "systemctl kill -s HUP ahanassa-rfq@production.service")
        self.offer(rfq=b"// v2", snapshot="snap-aaaa0003", marker="v3")
        self.assertEqual(self.run_activate(), 0)
        self.assertEqual(self.systemctl_calls()[-1], "systemctl restart ahanassa-rfq@production.service ahanassa-rfq-forward@production.service")

    def test_unhealthy_intake_after_switch_puts_the_previous_release_back_and_restarts_it(self):
        self.offer(rfq=b"// v1")
        self.assertEqual(self.run_activate(), 0)
        good = self.current()
        self.healthy = False
        self.offer(rfq=b"// broken", snapshot="snap-aaaa0002", marker="v2")
        self.assertEqual(self.run_activate(), 1)
        self.assertEqual(self.current(), good)
        self.assertRegex(self.state()["last_refused"]["reason"], "rfq: intake not healthy after restart")
        self.assertEqual(self.systemctl_calls()[-1], "systemctl restart ahanassa-rfq@production.service ahanassa-rfq-forward@production.service", "the services follow current back")

    def test_systemctl_failure_is_a_refusal(self):
        with open(self.sysctl_rc, "w") as f:
            f.write("1")
        self.offer(rfq=b"// v1")
        self.assert_refused("rfq: systemctl restart failed", "bootstrap")

    def test_enabled_env_refuses_a_bundle_without_the_service(self):
        self.offer()
        self.assertEqual(self.run_activate(), 1)
        self.assertRegex(self.state()["last_refused"]["reason"], "carries no rfq/rfq-ir.mjs")

    def test_disabled_env_ignores_the_service_file(self):
        self.cfg["envs"]["production"]["rfq"] = {"enabled": False}
        self.offer(rfq=b"// v1")
        self.assertEqual(self.run_activate(), 0)
        self.assertEqual(self.systemctl_calls(), [])

    def test_tampered_service_file_is_refused(self):
        self.offer(rfq=b"// v1", swap={"rfq/rfq-ir.mjs": b"// v9"})  # same length: only the sha256 differs
        self.assert_refused("rfq/rfq-ir.mjs does not match its sha256", "bootstrap")

    def test_other_service_file_names_are_refused(self):
        self.offer(rfq=b"// v1", rfq_name="evil.mjs")
        self.assert_refused("rfq list differs", "bootstrap")
        self.offer(rfq=b"// v1", extra={"rfq/extra.mjs": b"x"})
        self.assert_refused("not in manifest.json/bundle.json", "bootstrap")

    def test_private_dir_is_given_to_the_rfq_group(self):
        import grp
        group = grp.getgrgid(os.getgid()).gr_name
        self.cfg["rfq_group"] = group
        if os.getuid() != 0:
            self.skipTest("chown to root needs root (the Docker rehearsal covers it)")
        self.offer(rfq=b"// v1")
        self.assertEqual(self.run_activate(), 0)


if __name__ == "__main__":
    unittest.main()
