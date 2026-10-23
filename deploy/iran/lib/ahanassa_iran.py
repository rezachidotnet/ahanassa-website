"""W30 (W29 P1) - the domestic copy on iransrv: sync agent + root activator. Python 3 standard library only.

Two programs, two privilege levels (deploy/iran/RUNBOOK_P1.md):

  ahanassa-sync <env>      user ahanassa-sync, no shell. Pulls the newest SIGNED activation from the configured sources
                           in order (the GitHub artifact first, then the R2 / Arvan Object Storage mirror), downloads the
                           bundle it names when it is not already on the server, and hands both to the activator through
                           /srv/ahanassa/incoming/<env>/<seq>.ready. It never unpacks or serves anything.
  ahanassa-activate <env>  root oneshot (systemd .path unit on incoming/<env>/*.ready). Verifies the ed25519 signature
                           (ssh-keygen -Y verify, namespace ahanassa-ir-release, principal ci-<env>), the seq, the bundle
                           sha256, every file against the artifact's own manifest.json and the nginx includes against
                           their strict grammar; unpacks into a new release dir, precompresses, runs `nginx -t`, switches
                           the `current` symlink atomically, reloads nginx and smoke-tests the result. Any failure leaves
                           (or puts back) the previous release and alerts.

The activator's code is installed from the repository by the operator (/usr/local/lib/ahanassa/), never from a bundle:
a bundle is data only. Nothing here talks to www.ahanassa.com or changes it.
"""

from __future__ import annotations

import base64
import datetime as _dt
import fcntl
import gzip
import hashlib
import hmac
import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ACTIVATION_SCHEMA = "iran-activation.v1"
BUNDLE_SCHEMA = "iran-bundle.v1"
SIGNING_NAMESPACE = "ahanassa-ir-release"
ENVS = ("production", "staging")
NGINX_FILES = (
    "redirects-301.map",
    "redirects-302.map",
    "redirects-307.map",
    "redirects-308.map",
    "cache-control.map",
    "robots.map",
    "notfound.map",
    "headers.conf",
)
PRIVATE_FILES = ("rfq-variant-index.json",)
# W32 (W29 P2): the domestic RFQ intake, one file built in CI (scripts/iran/build-rfq-service.ts), listed with its sha256
# in bundle.json `rfq`. Optional in a bundle (a P1-era bundle has none); when present it must be exactly this file.
RFQ_FILES = ("rfq-ir.mjs",)
RFQ_UNITS = ("ahanassa-rfq@{env}.service", "ahanassa-rfq-forward@{env}.service")
# Text assets the activator precompresses (nginx gzip_static / brotli_static). Derived files are the only extra files allowed.
COMPRESSIBLE = re.compile(r"\.(?:html|js|mjs|css|json|svg|txt|xml|md|webmanifest|map|dxf|m3u8|ico)$")
DERIVED = (".gz", ".br")
MAX_ACTIVATION_BYTES = 64 * 1024
MAX_BUNDLE_BYTES = 2 * 1024**3
MAX_UNPACKED_BYTES = 3 * 1024**3
MAX_ENTRIES = 60000
DEFAULT_CACHE_CONTROL = "public, max-age=0, must-revalidate"
IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"


class Refused(Exception):
    """An activation that must not be applied. The message is the reason (state.json, alert)."""


def log(event: str, **fields) -> None:
    print(json.dumps({"event": event, **fields}, ensure_ascii=False, sort_keys=True), flush=True)


def utcnow() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json_atomic(path: str, data, mode: int = 0o644) -> None:
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=d)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write("\n")
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def read_json(path: str, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


# --- configuration -----------------------------------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "repo": "rezachidotnet/ahanassa-website",
    "root": "/srv/ahanassa",
    "allowed_signers": "/etc/ahanassa/allowed_signers",
    "hold_dir": "/etc/ahanassa",
    "credentials_dir": None,  # default: $CREDENTIALS_DIRECTORY (systemd LoadCredential=)
    "keep_releases": 5,
    "ssh_keygen": "ssh-keygen",
    "nginx": "nginx",
    "nginx_reload": ["systemctl", "reload", "nginx"],
    "brotli": "brotli",
    "curl": "curl",
    "systemctl": "systemctl",
    # W32: group of the RFQ service users; the release's private/ dir is made readable to it (root:<group> 0750).
    "rfq_group": None,
    # W32: per env, "rfq": {"enabled": true, "port": 8711} turns on the RFQ service steps after a switch.
    "envs": {
        "production": {"principal": "ci-production", "smoke_host": "new.ahanassa.ir"},
        "staging": {"principal": "ci-staging", "smoke_host": "staging.ahanassa.ir"},
    },
    "sources": [{"name": "github", "type": "github"}],
    "bale": None,  # {"chat_id": "...", "credential": "bale-token"}
    "timeouts": {"api": 20, "download": 120},
    # `nginx -s reload` / `systemctl reload nginx` return before the new workers answer: the smoke is retried for this
    # long before it counts as failed (a real failure persists and is refused after the window).
    "smoke_wait_seconds": 15,
}


def load_config(path: str | None) -> dict:
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            user = json.load(f)
        for k, v in user.items():
            if k == "envs":
                for env, e in v.items():
                    cfg["envs"].setdefault(env, {}).update(e)
            else:
                cfg[k] = v
    return cfg


def env_paths(cfg: dict, env: str) -> dict:
    if env not in ENVS:
        raise SystemExit(f"unknown env {env!r} (expected one of {', '.join(ENVS)})")
    root = cfg["root"]
    site = os.path.join(root, "site", env)
    return {
        "incoming": os.path.join(root, "incoming", env),
        "site": site,
        "releases": os.path.join(site, "releases"),
        "current": os.path.join(site, "current"),
        "previous": os.path.join(site, "previous"),
        "work": os.path.join(site, "work"),
        "state": os.path.join(site, "state.json"),  # root 0600: the activator's own record
        "status": os.path.join(site, "status.json"),  # 0644: what the agent and the operator may read
        "lock": os.path.join(site, ".activate.lock"),
    }


def credential(cfg: dict, name: str) -> str | None:
    base = cfg.get("credentials_dir") or os.environ.get("CREDENTIALS_DIRECTORY")
    if not base:
        return None
    try:
        with open(os.path.join(base, name), encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        return None


# --- activation record ---------------------------------------------------------------------------------------------------
_HEX40 = re.compile(r"^[0-9a-f]{40}$")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")
_SNAPSHOT = re.compile(r"^snap-[0-9a-z-]{4,64}$")
_ARTIFACT = re.compile(r"^iran-bundle-(production|staging)-[A-Za-z0-9._-]{1,120}$")
ACTIVATION_KEYS = {
    "schema", "env", "seq", "reason", "run_id", "code_sha", "snapshot_version", "manifest_sha256",
    "bundle_sha256", "bundle_bytes", "bundle_artifact", "created_at",
}


def parse_activation(raw: bytes, env: str) -> dict:
    """The signed activation.json, strictly: exact key set, types, formats. Raises Refused."""
    if len(raw) > MAX_ACTIVATION_BYTES:
        raise Refused("activation.json too large")
    try:
        a = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise Refused(f"activation.json is not JSON: {e}") from None
    if not isinstance(a, dict) or set(a) != ACTIVATION_KEYS:
        raise Refused(f"activation.json keys differ from {ACTIVATION_SCHEMA}")
    checks = [
        (a["schema"] == ACTIVATION_SCHEMA, "schema"),
        (a["env"] == env, f"env is {a.get('env')!r}, not {env!r}"),
        (isinstance(a["seq"], int) and not isinstance(a["seq"], bool) and 0 < a["seq"] < 2**53, "seq"),
        (a["reason"] in ("publish", "rollback"), "reason"),
        (isinstance(a["run_id"], int) and not isinstance(a["run_id"], bool) and a["run_id"] > 0, "run_id"),
        (isinstance(a["code_sha"], str) and _HEX40.match(a["code_sha"]), "code_sha"),
        (isinstance(a["snapshot_version"], str) and _SNAPSHOT.match(a["snapshot_version"]), "snapshot_version"),
        (isinstance(a["manifest_sha256"], str) and _HEX64.match(a["manifest_sha256"]), "manifest_sha256"),
        (isinstance(a["bundle_sha256"], str) and _HEX64.match(a["bundle_sha256"]), "bundle_sha256"),
        (isinstance(a["bundle_bytes"], int) and not isinstance(a["bundle_bytes"], bool) and 0 < a["bundle_bytes"] <= MAX_BUNDLE_BYTES, "bundle_bytes"),
        (isinstance(a["bundle_artifact"], str) and _ARTIFACT.match(a["bundle_artifact"]) and a["bundle_artifact"].startswith(f"iran-bundle-{env}-"), "bundle_artifact"),
        (isinstance(a["created_at"], str) and re.match(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$", a["created_at"]), "created_at"),
    ]
    for ok, what in checks:
        if not ok:
            raise Refused(f"activation.json: bad {what}")
    return a


def verify_signature(cfg: dict, env: str, data: bytes, sig: bytes) -> None:
    """ssh-keygen -Y verify against allowed_signers (principal ci-<env>, namespace ahanassa-ir-release). Raises Refused."""
    if len(sig) > 8192 or not sig.startswith(b"-----BEGIN SSH SIGNATURE-----"):
        raise Refused("signature: not an SSH signature")
    principal = cfg["envs"][env]["principal"]
    with tempfile.TemporaryDirectory() as d:
        sig_path = os.path.join(d, "activation.json.sig")
        with open(sig_path, "wb") as f:
            f.write(sig)
        r = subprocess.run(
            [cfg["ssh_keygen"], "-Y", "verify", "-f", cfg["allowed_signers"], "-I", principal, "-n", SIGNING_NAMESPACE, "-s", sig_path],
            input=data, capture_output=True, timeout=30,
        )
    if r.returncode != 0:
        raise Refused(f"signature: not valid for {principal} ({r.stderr.decode(errors='replace').strip()[:200]})")


# --- nginx include grammar (line-for-line equal to scripts/iran/render-nginx.ts) ---------------------------------------------
_PATH_CHARS = r"[^\s\"';{}$\\?#*\x00-\x1f\x7f]"
_LITERAL = r"(?:[A-Za-z0-9_/-]|\\\.)"
_ROBOTS = ("noindex", "noindex, nofollow", "nofollow", "none")
_GLOBAL_HEADERS = (
    "X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy",
    "Content-Security-Policy-Report-Only", "Content-Security-Policy", "Content-Signal", "Vary",
    "Strict-Transport-Security", "Cross-Origin-Opener-Policy",
)
GRAMMAR = {
    "redirect": [
        re.compile(rf'^"(/{_PATH_CHARS}*)" "((?:/|https://www\.ahanassa\.(?:com|ir)/){_PATH_CHARS}*)";$'),
        re.compile(rf'^"~\^(/{_LITERAL}*)\(\.\*\)\$" "(/{_PATH_CHARS}*)\$1";$'),
    ],
    "cache-control": [re.compile(rf'^"(/{_PATH_CHARS}*)" "({re.escape(IMMUTABLE_CACHE_CONTROL)}|{re.escape("public, max-age=300")})";$')],
    "robots": [re.compile(rf'^"(/{_PATH_CHARS}*|~\^(?:{_LITERAL}|\.\*)*\$?)" "({"|".join(re.escape(v) for v in _ROBOTS)})";$')],
    "notfound": [re.compile(r'^"~\^(/(?:[A-Za-z0-9_-]+/)+)" "(/(?:[A-Za-z0-9_-]+/)+)404\.html";$')],
    "headers": [re.compile(rf'^add_header ({"|".join(_GLOBAL_HEADERS)}) "([^"\\$\{{\}}\x00-\x1f\x7f]*)" always;$')],
}
_COMMENT_OR_BLANK = re.compile(r"^(?:#[^\x00-\x1f\x7f]*)?$")


def grammar_for(name: str) -> str | None:
    if re.fullmatch(r"redirects-(301|302|307|308)\.map", name):
        return "redirect"
    return {"cache-control.map": "cache-control", "robots.map": "robots", "notfound.map": "notfound", "headers.conf": "headers"}.get(name)


def check_nginx_include(name: str, text: str) -> list[str]:
    kind = grammar_for(name)
    if kind is None:
        return [f"{name}: not an allowed nginx include file"]
    if len(text.encode("utf-8")) > 1_048_576:
        return [f"{name}: larger than 1048576 bytes"]
    if "\r" in text:
        return [f"{name}: CR characters"]
    failures = []
    for i, line in enumerate(text.split("\n"), 1):
        if _COMMENT_OR_BLANK.fullmatch(line):
            continue
        m = next((m for m in (r.fullmatch(line) for r in GRAMMAR[kind]) if m), None)
        if m is None:
            failures.append(f"{name}:{i}: line not allowed: {line[:160]}")
        elif kind == "notfound" and m.group(1) != m.group(2):
            failures.append(f"{name}:{i}: 404 page outside its own prefix")
    return failures


# --- bundle verification + unpacking (root) --------------------------------------------------------------------------------
def _safe_member(name: str) -> bool:
    if not name or name.startswith("/") or "\\" in name or "\x00" in name or name.endswith("/"):
        return False
    return all(seg not in ("", ".", "..") for seg in name.split("/"))


def unpack_bundle(zip_path: str, activation: dict, dest: str, current_public: str | None) -> dict:
    """Verify the bundle zip against the activation + its own manifest and unpack it into `dest` (which must not exist).

    Every entry must be expected and every expected entry present (no extra file, no missing file); each written file is
    hashed while it is written and must match manifest.json (public/, private/) or bundle.json (nginx/). Unchanged public
    files are hard-linked from the current release. Raises Refused; `dest` is removed on failure.
    """
    size = os.path.getsize(zip_path)
    if size != activation["bundle_bytes"]:
        raise Refused(f"bundle: {size} bytes, activation says {activation['bundle_bytes']}")
    if sha256_file(zip_path) != activation["bundle_sha256"]:
        raise Refused("bundle: sha256 differs from the signed activation")
    try:
        zf = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile as e:
        raise Refused(f"bundle: not a zip ({e})") from None
    with zf:
        infos = zf.infolist()
        if len(infos) > MAX_ENTRIES:
            raise Refused("bundle: too many entries")
        names = [i.filename for i in infos]
        if len(set(names)) != len(names):
            raise Refused("bundle: duplicate entries")
        total = 0
        for i in infos:
            if not _safe_member(i.filename):
                raise Refused(f"bundle: unsafe entry name {i.filename!r}")
            mode = (i.external_attr >> 16) & 0o170000
            if i.is_dir() or (mode and mode != stat.S_IFREG):
                raise Refused(f"bundle: {i.filename} is not a regular file (directory, symlink or device)")
            if i.flag_bits & 0x1:
                raise Refused(f"bundle: {i.filename} is encrypted")
            if i.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                raise Refused(f"bundle: {i.filename} uses an unexpected compression method")
            total += i.file_size
        if total > MAX_UNPACKED_BYTES:
            raise Refused("bundle: unpacked size too large")

        def read_small(name: str, limit: int = 64 * 1024 * 1024) -> bytes:
            if name not in names:
                raise Refused(f"bundle: {name} missing")
            if zf.getinfo(name).file_size > limit:
                raise Refused(f"bundle: {name} too large")
            return zf.read(name)

        manifest_raw = read_small("manifest.json")
        if sha256_bytes(manifest_raw) != activation["manifest_sha256"]:
            raise Refused("bundle: manifest.json sha256 differs from the signed activation (not the artifact www serves)")
        manifest = json.loads(manifest_raw)
        for key, want in (("code_sha", activation["code_sha"]), ("snapshot_version", activation["snapshot_version"]), ("environment", activation["env"])):
            if manifest.get(key) != want:
                raise Refused(f"bundle: manifest.json {key} is {manifest.get(key)!r}, activation says {want!r}")
        bundle = json.loads(read_small("bundle.json"))
        if bundle.get("schema") != BUNDLE_SCHEMA or bundle.get("manifest_sha256") != activation["manifest_sha256"]:
            raise Refused("bundle: bundle.json does not belong to this manifest")

        expected: dict[str, tuple[str, int]] = {}
        for f in manifest.get("public_assets", []):
            p = f["path"]
            if not _safe_member(p) or p.endswith(DERIVED):
                raise Refused(f"bundle: manifest lists an unsafe public path {p!r}")
            expected[f"public/{p}"] = (f["sha256"], f["bytes"])
        priv = {f["path"]: f for f in manifest.get("private_snapshot", [])}
        for p in PRIVATE_FILES:
            if p not in priv:
                raise Refused(f"bundle: manifest lists no private-snapshot/{p}")
            expected[f"private/{p}"] = (priv[p]["sha256"], priv[p]["bytes"])
        rfq = {n.get("path"): n for n in bundle.get("rfq", [])}
        if rfq and set(rfq) != set(RFQ_FILES):
            raise Refused("bundle: bundle.json rfq list differs from the allowed service files")
        for n in rfq:
            expected[f"rfq/{n}"] = (rfq[n]["sha256"], rfq[n]["bytes"])
        nginx = {n.get("path"): n for n in bundle.get("nginx", [])}
        if set(nginx) != set(NGINX_FILES):
            raise Refused("bundle: bundle.json nginx list differs from the allowed include files")
        for n in NGINX_FILES:
            expected[f"nginx/{n}"] = (nginx[n]["sha256"], nginx[n]["bytes"])
        allowed = set(expected) | {"manifest.json", "bundle.json"}
        extra = sorted(set(names) - allowed)
        if extra:
            raise Refused(f"bundle: {len(extra)} file(s) not in manifest.json/bundle.json, e.g. {extra[0]}")
        missing = sorted(set(expected) - set(names))
        if missing:
            raise Refused(f"bundle: {len(missing)} listed file(s) missing, e.g. {missing[0]}")

        os.makedirs(dest, mode=0o755)
        try:
            linked = written = 0
            for name in sorted(expected):
                want_sha, want_bytes = expected[name]
                target = os.path.join(dest, *name.split("/"))
                os.makedirs(os.path.dirname(target), mode=0o755, exist_ok=True)
                h = hashlib.sha256()
                n = 0
                with zf.open(name) as src, open(target, "xb") as out:
                    for chunk in iter(lambda: src.read(1 << 20), b""):
                        h.update(chunk)
                        n += len(chunk)
                        if n > want_bytes:
                            raise Refused(f"bundle: {name} longer than manifest.json says")
                        out.write(chunk)
                if n != want_bytes or h.hexdigest() != want_sha:
                    raise Refused(f"bundle: {name} does not match its sha256/bytes in manifest.json/bundle.json")
                mode = 0o640 if name.startswith("private/") else 0o644
                os.chmod(target, mode)
                # Unchanged since the current release: one inode on disk (and its precompressed twins, below).
                if current_public and name.startswith("public/"):
                    old = os.path.join(current_public, *name.split("/")[1:])
                    if os.path.isfile(old) and not os.path.islink(old) and os.path.getsize(old) == n and sha256_file(old) == want_sha:
                        os.unlink(target)
                        os.link(old, target)
                        linked += 1
                        for ext in DERIVED:
                            if os.path.isfile(old + ext):
                                os.link(old + ext, target + ext)
                        continue
                written += 1
            for meta in ("manifest.json", "bundle.json"):
                with open(os.path.join(dest, meta), "wb") as f:
                    f.write(manifest_raw if meta == "manifest.json" else zf.read("bundle.json"))
                os.chmod(os.path.join(dest, meta), 0o644)
            os.chmod(os.path.join(dest, "private"), 0o750)
            if rfq:
                os.chmod(os.path.join(dest, "rfq"), 0o755)
        except BaseException:
            shutil.rmtree(dest, ignore_errors=True)
            raise
    for n in NGINX_FILES:
        with open(os.path.join(dest, "nginx", n), encoding="utf-8") as f:
            failures = check_nginx_include(n, f.read())
        if failures:
            shutil.rmtree(dest, ignore_errors=True)
            raise Refused(f"nginx include grammar: {failures[0]}")
    return {"files": len(expected), "linked": linked, "written": written}


def precompress(cfg: dict, public_dir: str) -> int:
    """gzip (and brotli, when the binary exists) next to each text asset, only when smaller. Deterministic (mtime 0)."""
    brotli = shutil.which(cfg.get("brotli") or "brotli")
    made = 0
    for dirpath, _dirs, files in os.walk(public_dir):
        for fn in files:
            if not COMPRESSIBLE.search(fn):
                continue
            src = os.path.join(dirpath, fn)
            if os.path.getsize(src) < 256 or os.path.exists(src + ".gz"):
                continue  # small files gain nothing; an existing .gz is a hard link to the current release's twin
            with open(src, "rb") as f:
                data = f.read()
            buf = io.BytesIO()
            with gzip.GzipFile(filename="", mode="wb", fileobj=buf, compresslevel=9, mtime=0) as gz:
                gz.write(data)
            if buf.tell() < len(data):
                with open(src + ".gz", "xb") as f:
                    f.write(buf.getvalue())
                os.chmod(src + ".gz", 0o644)
                made += 1
            if brotli and not os.path.exists(src + ".br"):
                r = subprocess.run([brotli, "-q", "11", "-k", "-f", "-o", src + ".br", src], capture_output=True, timeout=120)
                if r.returncode == 0 and os.path.getsize(src + ".br") >= len(data):
                    os.unlink(src + ".br")
                elif r.returncode == 0:
                    os.chmod(src + ".br", 0o644)
    return made


# --- nginx -----------------------------------------------------------------------------------------------------------------
def candidate_test_config(release: str, work: str) -> str:
    """A standalone config that loads the candidate's includes in the same contexts the site templates use."""
    inc = os.path.join(release, "nginx")
    maps = "\n".join(f'  map $uri $t_r{c} {{ default ""; include {inc}/redirects-{c}.map; }}' for c in (301, 302, 307, 308))
    return f"""pid {work}/nginx-test.pid;
error_log stderr;
events {{}}
http {{
  access_log off;
  map_hash_bucket_size 256;
  map_hash_max_size 65536;
{maps}
  map $uri $t_cc {{ default ""; include {inc}/cache-control.map; }}
  map $uri $t_robots {{ default ""; include {inc}/robots.map; }}
  map $uri $t_nf {{ default "/404.html"; include {inc}/notfound.map; }}
  server {{
    listen 127.0.0.1:9;
    location / {{ include {inc}/headers.conf; }}
  }}
}}
"""


def run(cmd: list[str], timeout: int = 60) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, timeout=timeout)


def nginx_test_candidate(cfg: dict, release: str, work: str) -> None:
    conf = os.path.join(work, "nginx-candidate.conf")
    with open(conf, "w", encoding="utf-8") as f:
        f.write(candidate_test_config(release, work))
    r = run([cfg["nginx"], "-t", "-q", "-c", conf])
    if r.returncode != 0:
        raise Refused(f"nginx -t (candidate includes) failed: {r.stderr.decode(errors='replace').strip()[:300]}")


def nginx_test_live(cfg: dict) -> None:
    r = run([cfg["nginx"], "-t", "-q"])
    if r.returncode != 0:
        raise Refused(f"nginx -t failed: {r.stderr.decode(errors='replace').strip()[:300]}")


def nginx_reload(cfg: dict) -> None:
    r = run(list(cfg["nginx_reload"]))
    if r.returncode != 0:
        raise Refused(f"nginx reload failed: {r.stderr.decode(errors='replace').strip()[:300]}")


# --- W32: the domestic RFQ intake that ships in the same release ---------------------------------------------------------------
def rfq_spec(cfg: dict, env: str) -> dict:
    return (cfg["envs"].get(env) or {}).get("rfq") or {}


def grant_private(cfg: dict, release: str) -> None:
    """private/ (the variant index) readable by the RFQ service group only: root:<rfq_group> 0750 / 0640."""
    group = cfg.get("rfq_group")
    if not group:
        return
    import grp

    gid = grp.getgrnam(group).gr_gid
    priv = os.path.join(release, "private")
    for p in [priv] + [os.path.join(priv, n) for n in os.listdir(priv)]:
        os.chown(p, 0, gid)


def rfq_probe(cfg: dict, env: str) -> bool:
    """GET http://127.0.0.1:<port>/healthz of the intake answers {"ok": true}."""
    port = int(rfq_spec(cfg, env).get("port", 0))
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/healthz", timeout=3) as r:
            return r.status == 200 and json.loads(r.read(4096)).get("ok") is True
    except Exception:  # noqa: BLE001 - any failure is "not healthy yet"
        return False


def rfq_after_switch(cfg: dict, env: str, release: str, previous_release: str | None, probe=None) -> str | None:
    """After `current` moved: restart the intake + forwarder if rfq-ir.mjs changed, else SIGHUP the intake (it re-reads
    the variant index); then wait for /healthz. Raises Refused (the caller puts the previous release back)."""
    spec = rfq_spec(cfg, env)
    if not spec.get("enabled"):
        return None
    new = os.path.join(release, "rfq", RFQ_FILES[0])
    if not os.path.isfile(new):
        raise Refused("rfq: the domestic RFQ intake is enabled for this env but the release carries no rfq/rfq-ir.mjs")
    old = os.path.join(previous_release, "rfq", RFQ_FILES[0]) if previous_release else None
    units = [u.format(env=env) for u in RFQ_UNITS]
    changed = not (old and os.path.isfile(old) and sha256_file(old) == sha256_file(new))
    r = run([cfg["systemctl"], "restart", *units], timeout=90) if changed else run([cfg["systemctl"], "kill", "-s", "HUP", units[0]])
    if r.returncode != 0:
        raise Refused(f"rfq: systemctl {'restart' if changed else 'kill -s HUP'} failed: {r.stderr.decode(errors='replace').strip()[:200]}")
    deadline = time.time() + float(spec.get("wait_seconds", 20))
    while not (probe or rfq_probe)(cfg, env):
        if time.time() >= deadline:
            raise Refused(f"rfq: intake not healthy after {'restart' if changed else 'reload'} (127.0.0.1:{spec.get('port')}/healthz)")
        time.sleep(0.5)
    action = "restarted" if changed else "reloaded_index"
    log("rfq", env=env, action=action)
    return action


def rfq_restore(cfg: dict, env: str) -> None:
    """Best effort after a refused switch: the services follow `current` back."""
    if rfq_spec(cfg, env).get("enabled"):
        r = run([cfg["systemctl"], "restart", *[u.format(env=env) for u in RFQ_UNITS]], timeout=90)
        if r.returncode != 0:
            log("rfq_restore_failed", env=env)


# --- smoke (curl --resolve <host>:443:127.0.0.1) -----------------------------------------------------------------------------
class CurlFetcher:
    def __init__(self, cfg: dict, host: str):
        self.cfg, self.host = cfg, host

    def __call__(self, path: str) -> tuple[int, dict, bytes]:
        with tempfile.TemporaryDirectory() as d:
            hdr, body = os.path.join(d, "h"), os.path.join(d, "b")
            r = run([self.cfg["curl"], "-sk", "--max-time", "15", "--resolve", f"{self.host}:443:127.0.0.1", "-D", hdr, "-o", body, "-w", "%{http_code}", f"https://{self.host}{path}"], timeout=30)
            status = int(r.stdout.decode() or 0) if r.returncode == 0 else 0
            headers: dict[str, str] = {}
            if os.path.exists(hdr):
                with open(hdr, encoding="latin-1", newline="") as f:
                    for line in f.read().splitlines()[1:]:
                        if ":" in line:
                            k, v = line.split(":", 1)
                            headers[k.strip().lower()] = (headers[k.strip().lower()] + ", " if k.strip().lower() in headers else "") + v.strip()
            data = read_bytes(body) if os.path.exists(body) else b""
            return status, headers, data


def smoke(release: str, activation: dict, fetch, seq: int) -> None:
    """The W29 §1.3 step 7 checks against the live server. Raises Refused on the first failure."""
    pub = os.path.join(release, "public")

    def expect(path, status, check=None, what=""):
        got, headers, body = fetch(path)
        if got != status:
            raise Refused(f"smoke: {path} -> {got}, expected {status}")
        if check and not check(headers, body):
            raise Refused(f"smoke: {path} {what}")
        return headers, body

    with open(os.path.join(pub, "index.html"), "rb") as f:
        index = f.read()
    expect("/", 200, lambda h, b: b == index, "is not this release's index.html")
    for page, file in (("/contact", "contact.html"), ("/en", "en.html"), ("/ar", "ar.html")):
        if os.path.exists(os.path.join(pub, file)):
            expect(page, 200)
    expect("/manifest.public.json", 200, lambda h, b: json.loads(b or b"{}").get("snapshot_version") == activation["snapshot_version"], f"does not name {activation['snapshot_version']}")
    with open(os.path.join(release, "nginx", "cache-control.map"), encoding="utf-8") as f:
        immutable = [m.group(1) for m in re.finditer(r'^"(/_next/static/[^"]+)" "public, max-age=31536000, immutable";$', f.read(), re.M)]
    if immutable:
        expect(immutable[0], 200, lambda h, b: "immutable" in h.get("cache-control", ""), "has no immutable Cache-Control")
    expect(f"/_next/static/chunks/__ahanassa-missing-{seq}.js", 404, lambda h, b: "immutable" not in h.get("cache-control", ""), "404 carries the one-year immutable Cache-Control")
    with open(os.path.join(release, "nginx", "redirects-308.map"), encoding="utf-8") as f:
        has_fa = '"~^/fa/(.*)$" "/$1";' in f.read().split("\n")
    if has_fa:
        expect("/fa/ahanassa-smoke", 308, lambda h, b: urllib.parse.urlsplit(h.get("location", "")).path == "/ahanassa-smoke", "does not redirect to /ahanassa-smoke")


def smoke_until(cfg: dict, release: str, activation: dict, fetch, seq: int) -> None:
    deadline = time.monotonic() + float(cfg.get("smoke_wait_seconds", 15))
    while True:
        try:
            smoke(release, activation, fetch, seq)
            return
        except Refused:
            if time.monotonic() >= deadline:
                raise
            time.sleep(1)


# --- alerts (Bale; optional, never fatal) ------------------------------------------------------------------------------------
def alert(cfg: dict, text: str) -> None:
    b = cfg.get("bale")
    token = credential(cfg, b["credential"]) if b else None
    if not b or not token:
        log("alert_not_sent", reason="bale not configured", text=text)
        return
    try:
        req = urllib.request.Request(f"https://tapi.bale.ai/bot{token}/sendMessage", data=json.dumps({"chat_id": b["chat_id"], "text": text[:3500]}).encode(), headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10).read()
        log("alert_sent")
    except Exception as e:  # noqa: BLE001 - an alert must never break activation
        log("alert_failed", error=type(e).__name__)


# --- the activator -----------------------------------------------------------------------------------------------------------
def _release_id(a: dict) -> str:
    return f"{a['snapshot_version']}-{a['code_sha'][:12]}-{a['seq']}"


def _point(link: str, target: str) -> None:
    tmp = f"{link}.new"
    if os.path.lexists(tmp):
        os.unlink(tmp)
    os.symlink(target, tmp)
    os.replace(tmp, link)


def _readlink(link: str) -> str | None:
    return os.readlink(link) if os.path.islink(link) else None


def _status(p: dict, state: dict) -> dict:
    releases = state.get("releases", {})
    current = releases.get(state.get("current") or "", {})
    return {
        "env": state.get("env"),
        "last_seq": state.get("last_seq", 0),
        "last_refused_seq": (state.get("last_refused") or {}).get("seq", 0),
        "last_refused": state.get("last_refused"),
        "current": state.get("current"),
        "snapshot_version": current.get("snapshot_version"),
        "code_sha": current.get("code_sha"),
        "activated_at": state.get("activated_at"),
        "bundles": sorted({r["bundle_sha256"] for r in releases.values() if r.get("bundle_sha256")}),
        "updated_at": utcnow(),
    }


def save_state(p: dict, state: dict) -> None:
    write_json_atomic(p["state"], state, 0o600)
    write_json_atomic(p["status"], _status(p, state), 0o644)


def pending(p: dict) -> list[int]:
    try:
        names = os.listdir(p["incoming"])
    except FileNotFoundError:
        return []
    return sorted(int(n[:-6]) for n in names if re.fullmatch(r"\d{1,16}\.ready", n))


def clear_incoming(p: dict, upto: int) -> None:
    for n in os.listdir(p["incoming"]):
        m = re.fullmatch(r"(\d{1,16})(\.ready)?", n)
        if m and int(m.group(1)) <= upto:
            path = os.path.join(p["incoming"], n)
            shutil.rmtree(path) if os.path.isdir(path) and not os.path.islink(path) else os.unlink(path)


def _copy_in(src: str, dst: str, limit: int) -> None:
    """Copy an agent-owned file into the root-owned work dir (no symlink following, size-capped) before trusting it."""
    fd = os.open(src, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as s, open(dst, "xb") as d:
        st = os.fstat(s.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_size > limit:
            raise Refused(f"incoming: {os.path.basename(src)} is not a regular file within limits")
        shutil.copyfileobj(s, d, 1 << 20)


def activate(cfg: dict, env: str, fetch=None, rfq_check=None) -> int:
    """Process the newest pending activation for `env`. 0 = activated or nothing to do, 1 = refused (old release kept)."""
    p = env_paths(cfg, env)
    for d in (p["releases"], p["work"]):
        os.makedirs(d, mode=0o755 if d == p["releases"] else 0o700, exist_ok=True)
    with open(p["lock"], "w") as lockf:
        fcntl.flock(lockf, fcntl.LOCK_EX)
        seqs = pending(p)
        if not seqs:
            log("nothing_pending", env=env)
            return 0
        seq = seqs[-1]
        state = read_json(p["state"], {}) or {}
        state.setdefault("env", env)
        state.setdefault("releases", {})
        work = os.path.join(p["work"], str(seq))
        shutil.rmtree(work, ignore_errors=True)
        os.makedirs(work, mode=0o700)
        switched_from = None
        try:
            if os.path.exists(os.path.join(cfg["hold_dir"], f"hold-{env}")):
                raise Refused(f"held: {cfg['hold_dir']}/hold-{env} exists (operator hold)")
            src = os.path.join(p["incoming"], str(seq))
            for n in ("activation.json", "activation.json.sig"):
                _copy_in(os.path.join(src, n), os.path.join(work, n), MAX_ACTIVATION_BYTES)
            raw = read_bytes(os.path.join(work, "activation.json"))
            sig = read_bytes(os.path.join(work, "activation.json.sig"))
            verify_signature(cfg, env, raw, sig)
            a = parse_activation(raw, env)
            if a["seq"] != seq:
                raise Refused(f"seq {a['seq']} differs from the incoming name {seq}")
            if a["seq"] <= state.get("last_seq", 0):
                raise Refused(f"seq {a['seq']} is not newer than the last applied {state.get('last_seq')} (replay or old activation)")

            reuse = next((rid for rid, r in state["releases"].items() if r.get("bundle_sha256") == a["bundle_sha256"] and os.path.isdir(os.path.join(p["releases"], rid))), None)
            current_id = os.path.basename(_readlink(p["current"]) or "") or None
            if reuse:
                release = os.path.join(p["releases"], reuse)
                if sha256_file(os.path.join(release, "manifest.json")) != a["manifest_sha256"]:
                    raise Refused(f"local release {reuse} no longer matches its manifest sha256")
                rid = reuse
                log("reuse_release", env=env, release=rid, reason=a["reason"])
            else:
                bundle_src = os.path.join(src, "bundle.zip")
                if not os.path.exists(bundle_src):
                    raise Refused("bundle: not delivered and not on the server")
                bundle = os.path.join(work, "bundle.zip")
                _copy_in(bundle_src, bundle, MAX_BUNDLE_BYTES)
                rid = _release_id(a)
                tmp = os.path.join(p["releases"], f".tmp-{seq}")
                shutil.rmtree(tmp, ignore_errors=True)
                current_public = os.path.join(p["current"], "public") if current_id and current_id != "bootstrap" else None
                stats = unpack_bundle(bundle, a, tmp, current_public)
                made = precompress(cfg, os.path.join(tmp, "public"))
                grant_private(cfg, tmp)
                for n in ("activation.json", "activation.json.sig"):
                    shutil.copy(os.path.join(work, n), os.path.join(tmp, n))
                release = os.path.join(p["releases"], rid)
                if os.path.exists(release):
                    shutil.rmtree(release)
                os.replace(tmp, release)
                log("unpacked", env=env, release=rid, precompressed=made, **stats)

            nginx_test_candidate(cfg, release, work)
            switched_from = current_id
            _point(p["current"], os.path.join("releases", rid))
            try:
                nginx_test_live(cfg)
                nginx_reload(cfg)
                smoke_until(cfg, release, a, fetch or CurlFetcher(cfg, cfg["envs"][env]["smoke_host"]), seq)
                prev_release = os.path.join(p["releases"], switched_from) if switched_from and switched_from != "bootstrap" else None
                rfq_after_switch(cfg, env, release, prev_release, rfq_check)
            except Refused:
                if switched_from:
                    _point(p["current"], os.path.join("releases", switched_from))
                    try:
                        nginx_test_live(cfg)
                        nginx_reload(cfg)
                    except Refused as e:
                        log("restore_reload_failed", env=env, error=str(e))
                    rfq_restore(cfg, env)
                raise
            if switched_from and switched_from != rid:
                _point(p["previous"], os.path.join("releases", switched_from))
            state["releases"][rid] = {k: a[k] for k in ("seq", "reason", "code_sha", "snapshot_version", "manifest_sha256", "bundle_sha256", "run_id")}
            state.update(last_seq=a["seq"], current=rid, activated_at=utcnow(), last_error=None)
            prune(p, state, int(cfg.get("keep_releases", 5)))
            save_state(p, state)
            log("activated", env=env, release=rid, seq=a["seq"], reason=a["reason"], snapshot_version=a["snapshot_version"])
            if (state.get("last_refused") or {}).get("alerted") and not (state["last_refused"] or {}).get("recovered"):
                state["last_refused"]["recovered"] = utcnow()
                save_state(p, state)
                alert(cfg, f"ahanassa domestic copy ({env}): recovered, serving {a['snapshot_version']} ({a['code_sha'][:12]}).")
            return 0
        except Refused as e:
            state["last_refused"] = {"seq": seq, "reason": str(e), "at": utcnow(), "alerted": True}
            state["last_error"] = str(e)
            save_state(p, state)
            log("refused", env=env, seq=seq, reason=str(e), kept=_readlink(p["current"]))
            alert(cfg, f"ahanassa domestic copy ({env}): activation {seq} REFUSED, still serving {os.path.basename(_readlink(p['current']) or '-')}. Reason: {e}")
            shutil.rmtree(os.path.join(p["releases"], f".tmp-{seq}"), ignore_errors=True)
            return 1
        finally:
            clear_incoming(p, seq)
            shutil.rmtree(work, ignore_errors=True)


def prune(p: dict, state: dict, keep: int) -> None:
    protect = {state.get("current"), os.path.basename(_readlink(p["previous"]) or ""), "bootstrap"}
    ordered = sorted(state["releases"], key=lambda r: state["releases"][r]["seq"], reverse=True)
    for rid in ordered[keep:]:
        if rid in protect:
            continue
        shutil.rmtree(os.path.join(p["releases"], rid), ignore_errors=True)
        del state["releases"][rid]
    for n in os.listdir(p["releases"]):
        if n.startswith(".tmp-"):
            shutil.rmtree(os.path.join(p["releases"], n), ignore_errors=True)


def bootstrap(cfg: dict, env: str) -> None:
    """First install: an empty release so nginx -t passes before the first real activation. Serves a holding page."""
    p = env_paths(cfg, env)
    rel = os.path.join(p["releases"], "bootstrap")
    if os.path.lexists(p["current"]):
        log("bootstrap_skipped", env=env, current=_readlink(p["current"]))
        return
    os.makedirs(os.path.join(rel, "public"), mode=0o755, exist_ok=True)
    os.makedirs(os.path.join(rel, "nginx"), mode=0o755, exist_ok=True)
    for n in NGINX_FILES:
        with open(os.path.join(rel, "nginx", n), "w", encoding="utf-8") as f:
            f.write("# bootstrap: no release activated yet\n")
    page = '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Ahan Asa</title></head><body><p>در حال آماده‌سازی</p></body></html>\n'
    for n in ("index.html", "404.html"):
        with open(os.path.join(rel, "public", n), "w", encoding="utf-8") as f:
            f.write(page)
    os.makedirs(p["incoming"], exist_ok=True)
    _point(p["current"], os.path.join("releases", "bootstrap"))
    state = read_json(p["state"], {}) or {}
    state.update(env=env, current="bootstrap", releases=state.get("releases", {}), last_seq=state.get("last_seq", 0))
    save_state(p, state)
    log("bootstrapped", env=env)


def local_rollback(cfg: dict, env: str, fetch=None, rfq_check=None) -> int:
    """Operator break-glass: point `current` back at `previous` (already verified when it was activated), test, reload, smoke."""
    p = env_paths(cfg, env)
    with open(p["lock"], "w") as lockf:
        fcntl.flock(lockf, fcntl.LOCK_EX)
        state = read_json(p["state"], {}) or {}
        prev = os.path.basename(_readlink(p["previous"]) or "")
        cur = os.path.basename(_readlink(p["current"]) or "")
        if not prev or prev not in state.get("releases", {}):
            print("no previous release to return to", file=sys.stderr)
            return 1
        _point(p["current"], os.path.join("releases", prev))
        try:
            nginx_test_live(cfg)
            nginx_reload(cfg)
            r = state["releases"][prev]
            smoke_until(cfg, os.path.join(p["releases"], prev), {"snapshot_version": r["snapshot_version"]}, fetch or CurlFetcher(cfg, cfg["envs"][env]["smoke_host"]), int(time.time()))
            rfq_after_switch(cfg, env, os.path.join(p["releases"], prev), os.path.join(p["releases"], cur), rfq_check)
        except Refused as e:
            _point(p["current"], os.path.join("releases", cur))
            nginx_reload(cfg)
            rfq_restore(cfg, env)
            print(f"rollback refused, kept {cur}: {e}", file=sys.stderr)
            return 1
        _point(p["previous"], os.path.join("releases", cur))
        state.update(current=prev, activated_at=utcnow())
        save_state(p, state)
        log("local_rollback", env=env, current=prev, previous=cur)
        return 0


# --- the sync agent (unprivileged) -------------------------------------------------------------------------------------------
def http_get(url: str, headers: dict | None = None, timeout: int = 20, dest: str | None = None, limit: int = MAX_ACTIVATION_BYTES):
    req = urllib.request.Request(url, method="GET")
    for k, v in (headers or {}).items():
        # Unredirected: a token never follows a redirect to another host (the blob URL carries its own SAS).
        (req.add_unredirected_header if k.lower() == "authorization" else req.add_header)(k, v)
    # urllib follows the GitHub artifact redirect (-> Azure blob SAS URL) and does not copy unredirected headers.
    with urllib.request.build_opener().open(req, timeout=timeout) as resp:
        if dest is None:
            data = resp.read(limit + 1)
            if len(data) > limit:
                raise ValueError(f"response larger than {limit} bytes")
            return data
        n = 0
        with open(dest, "wb") as f:
            for chunk in iter(lambda: resp.read(1 << 20), b""):
                n += len(chunk)
                if n > limit:
                    raise ValueError(f"download larger than {limit} bytes")
                f.write(chunk)
        return n


def s3_signed_headers(method: str, url: str, access_key: str, secret: str, region: str, now: _dt.datetime | None = None, extra: dict | None = None) -> dict:
    """AWS Signature V4 headers for an S3 request with an empty body (R2 and Arvan Object Storage are S3 compatible)."""
    now = now or _dt.datetime.now(_dt.timezone.utc)
    amz_date, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    u = urllib.parse.urlsplit(url)
    payload = hashlib.sha256(b"").hexdigest()
    headers = {"host": u.netloc, "x-amz-content-sha256": payload, "x-amz-date": amz_date, **{k.lower(): v for k, v in (extra or {}).items()}}
    signed = ";".join(sorted(headers))
    query = "&".join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(v, safe='-_.~')}" for k, v in sorted(urllib.parse.parse_qsl(u.query, keep_blank_values=True)))
    canonical = "\n".join([method, urllib.parse.quote(u.path or "/", safe="/-_.~"), query, *(f"{k}:{headers[k].strip()}" for k in sorted(headers)), "", signed, payload])
    scope = f"{day}/{region}/s3/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    key = f"AWS4{secret}".encode()
    for part in (day, region, "s3", "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    out = {k: v for k, v in headers.items() if k != "host"}
    out["Authorization"] = f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed}, Signature={signature}"
    return out


class GitHubSource:
    """The GitHub Actions artifacts of the publish runs (primary). IPv4 only from iransrv (GitHub has no AAAA)."""

    def __init__(self, cfg: dict, spec: dict):
        self.cfg, self.name = cfg, spec.get("name", "github")
        self.token = credential(cfg, spec.get("credential", "github-token"))
        self.api = spec.get("api", "https://api.github.com")

    def _h(self):
        h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ahanassa-sync"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _artifacts(self, name: str) -> list[dict]:
        q = urllib.parse.urlencode({"name": name, "per_page": 20})
        data = json.loads(http_get(f"{self.api}/repos/{self.cfg['repo']}/actions/artifacts?{q}", self._h(), self.cfg["timeouts"]["api"], limit=4 << 20))
        return [a for a in data.get("artifacts", []) if not a.get("expired") and a.get("name") == name]

    def _zip(self, artifact_id: int, dest: str, limit: int) -> None:
        http_get(f"{self.api}/repos/{self.cfg['repo']}/actions/artifacts/{artifact_id}/zip", self._h(), self.cfg["timeouts"]["download"], dest=dest, limit=limit)

    def activation(self, env: str) -> tuple[bytes, bytes, dict]:
        arts = sorted(self._artifacts(f"iran-activation-{env}"), key=lambda a: a.get("created_at", ""), reverse=True)
        if not arts:
            raise LookupError("no iran-activation artifact")
        with tempfile.TemporaryDirectory() as d:
            z = os.path.join(d, "a.zip")
            self._zip(arts[0]["id"], z, 1 << 20)
            with zipfile.ZipFile(z) as zf:
                return zf.read("activation.json"), zf.read("activation.json.sig"), {"artifact_id": arts[0]["id"]}

    def bundle(self, activation: dict, dest: str) -> None:
        arts = [a for a in self._artifacts(activation["bundle_artifact"]) if (a.get("workflow_run") or {}).get("id") == activation["run_id"]]
        if not arts:
            raise LookupError(f"bundle artifact {activation['bundle_artifact']} of run {activation['run_id']} not found (expired?)")
        outer = dest + ".outer.zip"
        try:
            self._zip(arts[0]["id"], outer, MAX_BUNDLE_BYTES + (64 << 20))
            with zipfile.ZipFile(outer) as zf, zf.open("iran-bundle.zip") as src, open(dest, "wb") as out:
                shutil.copyfileobj(src, out, 1 << 20)
        finally:
            if os.path.exists(outer):
                os.unlink(outer)


class S3Source:
    """A mirror of the same files in an S3-compatible bucket (R2: IPv4+IPv6 from iransrv; Arvan ir-thr-at1: domestic).

    Layout (written by CI, .github/scripts/v11-iran-activation.mjs): <prefix>/<env>/activation.json(.sig) and
    <prefix>/<env>/bundles/<bundle_sha256>.zip. Read-only credentials, two lines: access key id, secret.
    """

    def __init__(self, cfg: dict, spec: dict):
        self.cfg, self.spec, self.name = cfg, spec, spec["name"]
        cred = (credential(cfg, spec["credential"]) or "").split()
        self.key, self.secret = (cred + ["", ""])[:2]

    def _url(self, key: str) -> str:
        return f"{self.spec['endpoint'].rstrip('/')}/{self.spec['bucket']}/{self.spec.get('prefix', 'iran').strip('/')}/{key}"

    def _get(self, key: str, dest: str | None = None, limit: int = MAX_ACTIVATION_BYTES):
        url = self._url(key)
        h = s3_signed_headers("GET", url, self.key, self.secret, self.spec.get("region", "auto")) if self.key else {}
        return http_get(url, h, self.cfg["timeouts"]["download" if dest else "api"], dest=dest, limit=limit)

    def activation(self, env: str) -> tuple[bytes, bytes, dict]:
        return self._get(f"{env}/activation.json"), self._get(f"{env}/activation.json.sig"), {}

    def bundle(self, activation: dict, dest: str) -> None:
        self._get(f"{activation['env']}/bundles/{activation['bundle_sha256']}.zip", dest=dest, limit=MAX_BUNDLE_BYTES)


def make_sources(cfg: dict) -> list:
    out = []
    for spec in cfg.get("sources", []):
        if spec.get("enabled", True) is False:
            continue
        out.append(GitHubSource(cfg, spec) if spec["type"] == "github" else S3Source(cfg, spec))
    return out


def sync(cfg: dict, env: str, sources=None) -> int:
    """One tick: newest valid activation over all sources; bundle from the first source that has it (sha256-checked)."""
    p = env_paths(cfg, env)
    sources = make_sources(cfg) if sources is None else sources
    status = read_json(p["status"], {}) or {}
    agent_state_path = os.path.join(p["incoming"], "agent-state.json")
    agent = read_json(agent_state_path, {}) or {}
    floor = max(int(status.get("last_seq") or 0), int(status.get("last_refused_seq") or 0), int(agent.get("handed_seq") or 0))
    best = None
    for s in sources:
        try:
            raw, sig, meta = s.activation(env)
            verify_signature(cfg, env, raw, sig)  # pre-filter; the activator verifies again as root
            a = parse_activation(raw, env)
        except Exception as e:  # noqa: BLE001 - one source down or filtered must not stop the others
            log("source_failed", env=env, source=s.name, step="activation", error=f"{type(e).__name__}: {str(e)[:200]}")
            continue
        log("source_ok", env=env, source=s.name, seq=a["seq"], snapshot_version=a["snapshot_version"])
        if best is None or a["seq"] > best[0]["seq"]:
            best = (a, raw, sig, s.name)
    if best is None:
        log("no_source", env=env)
        return 2
    a, raw, sig, origin = best
    if a["seq"] <= floor:
        log("up_to_date", env=env, seq=a["seq"], floor=floor)
        return 0
    stage = os.path.join(p["incoming"], f".stage-{a['seq']}")
    shutil.rmtree(stage, ignore_errors=True)
    os.makedirs(stage, mode=0o750)
    try:
        with open(os.path.join(stage, "activation.json"), "wb") as f:
            f.write(raw)
        with open(os.path.join(stage, "activation.json.sig"), "wb") as f:
            f.write(sig)
        if a["bundle_sha256"] in (status.get("bundles") or []):
            log("bundle_local", env=env, seq=a["seq"], reason=a["reason"])
        else:
            got = False
            for s in sources:
                dest = os.path.join(stage, "bundle.zip")
                try:
                    s.bundle(a, dest)
                    if os.path.getsize(dest) != a["bundle_bytes"] or sha256_file(dest) != a["bundle_sha256"]:
                        raise ValueError("sha256/bytes differ from the signed activation")
                    got = True
                    log("bundle_ok", env=env, source=s.name, bytes=a["bundle_bytes"])
                    break
                except Exception as e:  # noqa: BLE001
                    log("source_failed", env=env, source=s.name, step="bundle", error=f"{type(e).__name__}: {str(e)[:200]}")
                    if os.path.exists(dest):
                        os.unlink(dest)
            if not got:
                log("bundle_unavailable", env=env, seq=a["seq"])
                return 3
        final = os.path.join(p["incoming"], str(a["seq"]))
        shutil.rmtree(final, ignore_errors=True)
        os.replace(stage, final)
        ready = os.path.join(p["incoming"], f"{a['seq']}.ready")
        with open(ready + ".tmp", "w") as f:
            f.write(f"{origin}\n")
        os.replace(ready + ".tmp", ready)
        write_json_atomic(agent_state_path, {"handed_seq": a["seq"], "handed_at": utcnow(), "source": origin}, 0o640)
        log("handed_off", env=env, seq=a["seq"], source=origin)
        return 0
    finally:
        shutil.rmtree(stage, ignore_errors=True)


# --- Arvan edge ranges (weekly, alert only) ------------------------------------------------------------------------------
ARVAN_RANGES_URL = "https://www.arvancloud.ir/en/ips.txt"


def parse_cidrs(text: str) -> set[str]:
    """ips.txt has no trailing newline (INVENTORY_20261022.md); any whitespace separates entries."""
    import ipaddress

    out = set()
    for tok in text.split():
        out.add(str(ipaddress.ip_network(tok.strip(), strict=True)))
    return out


def arvan_check(cfg: dict, snapshot_path: str = "/etc/ufw/arvan-edge-v4.txt", fetch=None) -> int:
    """Compare Arvan's published edge list with the snapshot ufw was built from. Never changes the firewall: a wrong list
    takes the site down, so a change is an operator step (FIREWALL.md). 0 = same, 1 = changed (alert), 2 = unreadable."""
    try:
        live = parse_cidrs((fetch or (lambda: http_get(ARVAN_RANGES_URL, {"User-Agent": "ahanassa-arvan-check"}, 20).decode()))())
        with open(snapshot_path, encoding="utf-8") as f:
            known = parse_cidrs(f.read())
    except Exception as e:  # noqa: BLE001
        log("arvan_check_failed", error=f"{type(e).__name__}: {str(e)[:200]}")
        return 2
    if live == known:
        log("arvan_ranges_unchanged", count=len(live))
        return 0
    added, removed = sorted(live - known), sorted(known - live)
    log("arvan_ranges_changed", added=added, removed=removed)
    alert(cfg, f"ahanassa iransrv: ArvanCloud edge ranges changed (added {', '.join(added) or '-'}; removed {', '.join(removed) or '-'}). ufw/nginx real_ip NOT changed — operator step, deploy/iran/FIREWALL.md §3.")
    return 1


# --- entry points --------------------------------------------------------------------------------------------------------------
def _args(argv: list[str]) -> tuple[dict, list[str]]:
    cfg_path = os.environ.get("AHANASSA_IRAN_CONFIG", "/etc/ahanassa/iran.json")
    rest = []
    it = iter(argv)
    for a in it:
        if a == "--config":
            cfg_path = next(it)
        else:
            rest.append(a)
    return load_config(cfg_path), rest


def main_sync(argv: list[str] | None = None) -> int:
    cfg, rest = _args(sys.argv[1:] if argv is None else argv)
    if len(rest) != 1:
        print("usage: ahanassa-sync [--config FILE] <production|staging>", file=sys.stderr)
        return 64
    os.umask(0o027)
    return sync(cfg, rest[0])


def main_activate(argv: list[str] | None = None) -> int:
    cfg, rest = _args(sys.argv[1:] if argv is None else argv)
    if rest == ["arvan-check"]:
        return arvan_check(cfg)
    if len(rest) == 2 and rest[0] in ("bootstrap", "rollback", "status", "clear-refused"):
        cmd, env = rest
        if cmd == "bootstrap":
            bootstrap(cfg, env)
            return 0
        if cmd == "rollback":
            return local_rollback(cfg, env)
        if cmd == "clear-refused":
            # Operator: after fixing the cause (hold removed, nginx repaired), let the agent offer the same seq again.
            p = env_paths(cfg, env)
            state = read_json(p["state"], {}) or {}
            state["last_refused"] = None
            save_state(p, state)
            log("cleared_refused", env=env)
            return 0
        print(json.dumps(read_json(env_paths(cfg, env)["status"], {}), indent=1, ensure_ascii=False))
        return 0
    if len(rest) == 1:
        os.umask(0o022)
        return activate(cfg, rest[0])
    print("usage: ahanassa-activate [--config FILE] <env> | bootstrap|rollback|status|clear-refused <env> | arvan-check", file=sys.stderr)
    return 64


if __name__ == "__main__":
    sys.exit(main_activate())
