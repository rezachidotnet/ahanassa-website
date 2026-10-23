import { bearerMatches } from "../rfq-worker/admin.ts";
import type { NodeD1 } from "./sqlite-d1.ts";

/**
 * W32 (D-IR-8): the domestic admin view — what staff open during an international cutoff, when RFQs are held on
 * iransrv and Odoo cannot see them yet:
 *
 *   GET /__admin/ir/                 a small page (no data in it); it asks for the token and then calls:
 *   GET /__admin/ir/rfqs?status=undelivered|manual_review|all&limit=50
 *                                    the RFQs WITH contact details, items and file list (bearer ADMIN_TOKEN)
 *   GET /__admin/attachments/<id>    (the Worker's own admin route) downloads one file from this server's disk
 *
 * Same bearer, same constant-time check and same "404 for a wrong token" as lib/rfq-worker/admin.ts. Every list call
 * is written to ir_admin_access_log (actor, action, time — never the data shown). Responses are no-store.
 * nginx serves /__admin/ only to the operator allow-list (deploy/iran/nginx).
 */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const ACTOR = /^[A-Za-z0-9._@ -]{1,64}$/;

const STATUS_SQL: Record<string, string> = {
  undelivered: `r.odoo_rfq_reference IS NULL AND r.sync_status IN ('pending', 'queued', 'syncing', 'retry', 'manual_review')`,
  manual_review: `r.sync_status = 'manual_review'`,
  all: `1 = 1`,
};

export async function handleIrAdmin(request: Request, url: URL, db: NodeD1, adminToken: string | undefined): Promise<Response | null> {
  if (!url.pathname.startsWith("/__admin/ir/")) return null;
  if (request.method !== "GET") return json(405, { ok: false });
  if (url.pathname === "/__admin/ir/") return new Response(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
  if (!(await bearerMatches(request.headers.get("authorization"), adminToken))) return json(404, { ok: false });
  if (url.pathname !== "/__admin/ir/rfqs") return json(404, { ok: false });
  const status = url.searchParams.get("status") ?? "undelivered";
  const where = STATUS_SQL[status];
  if (!where) return json(400, { ok: false, error: `status must be one of ${Object.keys(STATUS_SQL).join(", ")}` });
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));
  const rfqs = db.q<Record<string, unknown>>(
    `SELECT r.id, r.reference_number, r.submitted_at, r.locale, r.sync_status, r.last_sync_error_code, r.odoo_rfq_reference,
            r.company_name, r.message, r.attachments_channel,
            c.full_name, c.phone_e164, c.phone_national, c.email_normalized, c.city,
            o.attempt_count, o.available_at
     FROM rfqs r JOIN rfq_contacts c ON c.rfq_id = r.id
     LEFT JOIN integration_outbox o ON o.aggregate_type = 'rfq' AND o.aggregate_id = r.id
     WHERE ${where} ORDER BY r.submitted_at ASC LIMIT ?`,
    limit,
  );
  for (const r of rfqs) {
    r.items = db.q(`SELECT line_number, sku_snapshot, freeform_title, size_text, quantity_text, unit_ref, length_mm, description FROM rfq_items WHERE rfq_id = ? ORDER BY line_number`, r.id as string);
    r.files = db.q(
      `SELECT a.id, a.slot, a.original_filename, a.byte_size, a.upload_status, a.failure_code, f.verified_at AS r2_verified_at
       FROM rfq_attachments a LEFT JOIN ir_file_remote f ON f.attachment_id = a.id WHERE a.rfq_id = ? AND a.deleted_at IS NULL ORDER BY a.slot`,
      r.id as string,
    );
  }
  const actorHeader = request.headers.get("x-admin-actor") ?? "";
  const actor = ACTOR.test(actorHeader) ? actorHeader : "unnamed";
  db.sqlite.prepare(`INSERT INTO ir_admin_access_log (at, actor, action, rfq_id) VALUES (?, ?, ?, NULL)`).run(new Date().toISOString(), actor, `list:${status}:${rfqs.length}`);
  console.log(JSON.stringify({ operation: "ir.admin", action: "list", status, count: rfqs.length, actor }));
  return json(200, { ok: true, status, rfqs });
}

const PAGE = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>RFQ — سرور داخلی</title>
<style>body{font:14px/1.6 system-ui,sans-serif;margin:16px;max-width:1100px}input,select,button{font:inherit;padding:4px 8px}table{border-collapse:collapse;width:100%;margin-top:8px}td,th{border:1px solid #ccc;padding:4px 6px;vertical-align:top;text-align:start}.ltr{direction:ltr;unicode-bidi:isolate}</style></head>
<body><h1>درخواست‌های نگه‌داشته روی سرور داخلی</h1>
<p>توکن ادمین فقط در این زبانه نگه داشته می‌شود.</p>
<form id="f"><input id="t" type="password" placeholder="ADMIN_TOKEN" autocomplete="off" required> <input id="a" placeholder="نام شما" maxlength="64">
<select id="s"><option value="undelivered">ارسال‌نشده به Odoo</option><option value="manual_review">بررسی دستی</option><option value="all">همه</option></select> <button>نمایش</button></form>
<div id="out"></div>
<script>
const $=id=>document.getElementById(id);$("t").value=sessionStorage.getItem("t")||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const H=()=>({authorization:"Bearer "+$("t").value,"x-admin-actor":$("a").value||"unnamed"});
async function dl(id,name){const r=await fetch("/__admin/attachments/"+encodeURIComponent(id),{headers:H()});if(!r.ok){alert("دانلود نشد: "+r.status);return}const b=await r.blob();const u=URL.createObjectURL(b);const l=document.createElement("a");l.href=u;l.download=name||id;l.click();URL.revokeObjectURL(u)}
$("f").onsubmit=async e=>{e.preventDefault();sessionStorage.setItem("t",$("t").value);const r=await fetch("/__admin/ir/rfqs?status="+$("s").value,{headers:H()});
if(!r.ok){$("out").textContent="خطا "+r.status;return}const d=await r.json();
$("out").innerHTML="<p>"+d.rfqs.length+" مورد</p><table><tr><th>شماره</th><th>زمان</th><th>وضعیت</th><th>مشتری</th><th>اقلام</th><th>فایل‌ها</th><th>پیام</th></tr>"+d.rfqs.map(r=>"<tr><td class=ltr>"+esc(r.reference_number)+"<br>"+esc(r.odoo_rfq_reference||"")+"</td><td class=ltr>"+esc(r.submitted_at)+"</td><td class=ltr>"+esc(r.sync_status)+" "+esc(r.last_sync_error_code||"")+" #"+esc(r.attempt_count)+"</td><td>"+esc(r.full_name)+"<br><span class=ltr>"+esc(r.phone_e164||r.phone_national)+"</span><br><span class=ltr>"+esc(r.email_normalized)+"</span><br>"+esc(r.company_name)+" "+esc(r.city)+"</td><td>"+r.items.map(i=>esc(i.sku_snapshot||i.freeform_title)+" "+esc(i.size_text)+" — "+esc(i.quantity_text)+" "+esc(i.unit_ref)+(i.length_mm?" L="+esc(i.length_mm):"")+(i.description?"<br><small>"+esc(i.description)+"</small>":"")).join("<br>")+"</td><td>"+r.files.map(f=>f.upload_status==="uploaded"?"<button data-id='"+esc(f.id)+"' data-n='"+esc(f.original_filename)+"'>"+esc(f.original_filename||f.slot)+"</button>":esc(f.original_filename)+" ("+esc(f.failure_code||f.upload_status)+")").join("<br>")+"</td><td>"+esc(r.message)+"</td></tr>").join("")+"</table>";
document.querySelectorAll("button[data-id]").forEach(b=>b.onclick=()=>dl(b.dataset.id,b.dataset.n))};
</script></body></html>`;
