"use client";

import { useRef, type RefObject } from "react";
import { FileText, Download, Paperclip, X, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/locales";
import { ITEM_LIST_TEMPLATE_PATH, MAX_RFQ_FILES, RFQ_FILE_ACCEPT, type RfqFileRejection } from "@/lib/rfq/attachment-policy";
import { formatFileSize } from "@/lib/rfq/attachment-notes";
import type { ExtractStatus } from "@/components/contact/use-rfq-list-extraction";
import type { ExtractFailureReason } from "@/lib/rfq/extract/browser";

/**
 * «بارگذاری لیست اقلام» — the optional file field of the RFQ form
 * (owner decision D-RFQ-FILE; docs/RFQ_FILE_UPLOAD.md). Same card, label,
 * button and message styles as the rest of the form (W10.2/W10.3). Rendered
 * by EnquiryForm only when the RFQ Worker reports upload as enabled, so the
 * prerendered page (identical on staging and production, r4) has no field.
 *
 * Files never leave the browser before the RFQ is accepted, are never kept in
 * storage (a reload or «ادامه انتخاب محصول» drops them), and nothing from a
 * file is ever shown back except its name and size — W13.3 adds one
 * exception for the person who attached it: the rows read from their list
 * (docs/RFQ_INSTANT_EXTRACT.md), as plain text in their own form.
 */
export type RfqFileError = { name: string; reason: RfqFileRejection | "read_error" | "uploads_disabled" };

const FORMATS = "JPG, PNG, WEBP, HEIC, PDF, XLSX, XLS, CSV, DOCX, TXT";

const copy: Record<
  Locale,
  {
    title: string;
    optional: string;
    body: string;
    formats: string;
    choose: string;
    template: string;
    remove: (name: string) => string;
    counter: (n: number, max: number) => string;
    notKept: string;
    errors: Record<RfqFileError["reason"], string>;
    readsLists: string;
    reading: string;
    done: (added: number, review: number) => string;
    overflow: (n: number) => string;
    empty: string;
    failed: Record<ExtractFailureReason, string>;
    retry: string;
    removeRows: string;
  }
> = {
  fa: {
    title: "بارگذاری لیست اقلام",
    optional: "اختیاری",
    body: "اگر لیست خرید، فاکتور یا عکس لیست اقلام دارید، آن را اینجا پیوست کنید؛ با پیوست فایل، پر کردن ردیف‌های بالا لازم نیست. حداکثر ۵ فایل، هر فایل تا ۱۵ مگابایت.",
    formats: `فرمت‌های مجاز: ${FORMATS}`,
    choose: "انتخاب فایل",
    template: "دریافت فایل نمونه اکسل",
    remove: (name) => `حذف ${name}`,
    counter: (n, max) => `فایل‌ها: ${n} / ${max}`,
    notKept: "فایل‌ها فقط در همین صفحه نگه داشته می‌شوند؛ پیش از ترک صفحه، درخواست را ارسال کنید.",
    errors: {
      too_many_files: "حداکثر ۵ فایل می‌توانید پیوست کنید.",
      empty_file: "فایل خالی است.",
      file_too_large: "حجم فایل بیشتر از ۱۵ مگابایت است.",
      extension_not_allowed: `این نوع فایل پذیرفته نمی‌شود. فرمت‌های مجاز: ${FORMATS}`,
      macro_file: "فایل‌های دارای ماکرو (مانند xlsm و docm) پذیرفته نمی‌شوند. فایل را بدون ماکرو (xlsx یا docx) ذخیره کنید.",
      executable_or_archive: "فایل‌های اجرایی و فشرده (مانند exe و zip) پذیرفته نمی‌شوند.",
      content_mismatch: "محتوای فایل با پسوند آن هم‌خوانی ندارد.",
      read_error: "خواندن فایل ممکن نشد. دوباره انتخاب کنید.",
      uploads_disabled: "امکان پیوست فایل در حال حاضر وجود ندارد. فایل‌ها را حذف کنید و دوباره ارسال کنید.",
    },
    readsLists: "اقلام فایل شما (اکسل، CSV، عکس یا PDF) در چند ثانیه در ردیف‌های بالا نوشته می‌شود تا پیش از ارسال آن‌ها را بررسی و ویرایش کنید. خود فایل هم همراه درخواست ارسال می‌شود.",
    reading: "در حال خواندن لیست شما… (معمولاً ۵ تا ۱۵ ثانیه)",
    done: (added, review) => `${added} ردیف از این فایل در فرم نوشته شد. لطفاً ردیف‌ها را بررسی کنید${review ? `؛ ${review} ردیف علامت «لطفاً بررسی کنید» دارد` : ""}.`,
    overflow: (n) => `${n} قلم دیگر جا نشد (حداکثر ۲۰ ردیف)؛ فایل کامل همراه درخواست ارسال می‌شود.`,
    empty: "قلمی در این فایل پیدا نشد. فایل پیوست است و همراه درخواست ارسال می‌شود.",
    failed: {
      unsupported: "این فایل خودکار خوانده نمی‌شود. فایل پیوست است و کارشناسان ما آن را بررسی می‌کنند.",
      unreadable: "خواندن این فایل ممکن نشد. فایل پیوست است و همراه درخواست ارسال می‌شود؛ می‌توانید ردیف‌ها را خودتان وارد کنید.",
      timeout: "خواندن این فایل بیش از حد طول کشید. فایل پیوست است و همراه درخواست ارسال می‌شود؛ می‌توانید دوباره امتحان کنید یا ردیف‌ها را خودتان وارد کنید.",
      rate_limited: "در این لحظه فایل‌های زیادی خوانده می‌شود؛ کمی بعد دوباره امتحان کنید. فایل پیوست است و همراه درخواست ارسال می‌شود.",
      verification: "تأیید امنیتی برای خواندن فایل کامل نشد. فایل پیوست است و همراه درخواست ارسال می‌شود.",
      unavailable: "خواندن خودکار فایل الان در دسترس نیست. فایل پیوست است و همراه درخواست ارسال می‌شود.",
      failed: "خواندن خودکار این فایل ممکن نشد. فایل پیوست است و همراه درخواست ارسال می‌شود؛ می‌توانید ردیف‌ها را خودتان وارد کنید.",
    },
    retry: "خواندن دوباره",
    removeRows: "حذف ردیف‌های این فایل",
  },
  en: {
    title: "Upload your item list",
    optional: "optional",
    body: "Have a purchase list, an invoice or a photo of your list? Attach it here; with a file, the rows above are not required. Up to 5 files, 15 MB each.",
    formats: `Allowed formats: ${FORMATS}`,
    choose: "Choose files",
    template: "Download the Excel template",
    remove: (name) => `Remove ${name}`,
    counter: (n, max) => `Files: ${n} / ${max}`,
    notKept: "Files are kept on this page only; send your request before leaving it.",
    errors: {
      too_many_files: "You can attach up to 5 files.",
      empty_file: "The file is empty.",
      file_too_large: "The file is larger than 15 MB.",
      extension_not_allowed: `This file type is not accepted. Allowed formats: ${FORMATS}`,
      macro_file: "Files with macros (such as xlsm or docm) are not accepted. Save the file without macros (xlsx or docx).",
      executable_or_archive: "Executable and compressed files (such as exe or zip) are not accepted.",
      content_mismatch: "The file's content does not match its extension.",
      read_error: "The file could not be read. Please choose it again.",
      uploads_disabled: "File upload is not available right now. Remove the files and send again.",
    },
    readsLists: "The items in your file (Excel, CSV, a photo or a PDF) are written into the rows above within seconds, so you can check and edit them before sending. The file itself is sent with your request too.",
    reading: "Reading your list… (usually 5–15 seconds)",
    done: (added, review) => `${added} ${added === 1 ? "row was" : "rows were"} filled from this file. Please check them${review ? `; ${review} marked "Please check"` : ""}.`,
    overflow: (n) => `${n} more ${n === 1 ? "item did" : "items did"} not fit (20 rows at most); the whole file is sent with your request.`,
    empty: "No items were found in this file. It stays attached and is sent with your request.",
    failed: {
      unsupported: "This file is not read automatically. It stays attached and our team will review it.",
      unreadable: "This file could not be read. It stays attached and is sent with your request; you can enter the rows yourself.",
      timeout: "Reading this file took too long. It stays attached and is sent with your request; try again or enter the rows yourself.",
      rate_limited: "Many files are being read right now; please try again shortly. The file stays attached and is sent with your request.",
      verification: "The security check for reading the file did not complete. The file stays attached and is sent with your request.",
      unavailable: "Automatic reading is not available right now. The file stays attached and is sent with your request.",
      failed: "This file could not be read automatically. It stays attached and is sent with your request; you can enter the rows yourself.",
    },
    retry: "Read again",
    removeRows: "Remove this file's rows",
  },
  ar: {
    title: "تحميل قائمة الأصناف",
    optional: "اختياري",
    body: "هل لديك قائمة شراء أو فاتورة أو صورة لقائمتك؟ أرفقها هنا؛ عند إرفاق ملف لا يلزم ملء الصفوف أعلاه. حتى 5 ملفات، بحد أقصى 15 ميغابايت لكل ملف.",
    formats: `الصيغ المسموح بها: ${FORMATS}`,
    choose: "اختيار الملفات",
    template: "تنزيل نموذج Excel",
    remove: (name) => `إزالة ${name}`,
    counter: (n, max) => `الملفات: ${n} / ${max}`,
    notKept: "تُحفظ الملفات في هذه الصفحة فقط؛ أرسل طلبك قبل مغادرتها.",
    errors: {
      too_many_files: "يمكنك إرفاق 5 ملفات كحد أقصى.",
      empty_file: "الملف فارغ.",
      file_too_large: "حجم الملف أكبر من 15 ميغابايت.",
      extension_not_allowed: `نوع الملف هذا غير مقبول. الصيغ المسموح بها: ${FORMATS}`,
      macro_file: "الملفات التي تحتوي على وحدات ماكرو (مثل xlsm أو docm) غير مقبولة. احفظ الملف دون ماكرو (xlsx أو docx).",
      executable_or_archive: "الملفات التنفيذية والمضغوطة (مثل exe أو zip) غير مقبولة.",
      content_mismatch: "محتوى الملف لا يطابق امتداده.",
      read_error: "تعذّرت قراءة الملف. يرجى اختياره مرة أخرى.",
      uploads_disabled: "رفع الملفات غير متاح حاليًا. أزل الملفات وأرسل مرة أخرى.",
    },
    readsLists: "تُكتب أصناف ملفك (Excel أو CSV أو صورة أو PDF) في الصفوف أعلاه خلال ثوانٍ لتراجعها وتعدّلها قبل الإرسال. ويُرسل الملف نفسه مع طلبك أيضًا.",
    reading: "جارٍ قراءة قائمتك… (عادةً من ٥ إلى ١٥ ثانية)",
    done: (added, review) => `تمت كتابة ${added} صف من هذا الملف في النموذج. يرجى مراجعتها${review ? `؛ ${review} منها عليها علامة «يرجى المراجعة»` : ""}.`,
    overflow: (n) => `لم يتسع ${n} صنف آخر (الحد الأقصى 20 صفًا)؛ يُرسل الملف كاملًا مع طلبك.`,
    empty: "لم يُعثر على أصناف في هذا الملف. يبقى الملف مرفقًا ويُرسل مع طلبك.",
    failed: {
      unsupported: "لا تتم قراءة هذا الملف تلقائيًا. يبقى مرفقًا وسيراجعه فريقنا.",
      unreadable: "تعذرت قراءة هذا الملف. يبقى مرفقًا ويُرسل مع طلبك؛ يمكنك إدخال الصفوف بنفسك.",
      timeout: "استغرقت قراءة هذا الملف وقتًا طويلًا. يبقى مرفقًا ويُرسل مع طلبك؛ أعد المحاولة أو أدخل الصفوف بنفسك.",
      rate_limited: "تتم قراءة ملفات كثيرة الآن؛ أعد المحاولة بعد قليل. يبقى الملف مرفقًا ويُرسل مع طلبك.",
      verification: "لم يكتمل التحقق الأمني لقراءة الملف. يبقى الملف مرفقًا ويُرسل مع طلبك.",
      unavailable: "القراءة التلقائية غير متاحة الآن. يبقى الملف مرفقًا ويُرسل مع طلبك.",
      failed: "تعذرت قراءة هذا الملف تلقائيًا. يبقى مرفقًا ويُرسل مع طلبك؛ يمكنك إدخال الصفوف بنفسك.",
    },
    retry: "إعادة القراءة",
    removeRows: "إزالة صفوف هذا الملف",
  },
};

export function RfqFilesField({
  locale,
  files,
  errors,
  disabled,
  onAdd,
  onRemove,
  readsLists = false,
  statuses = [],
  onRemoveRows,
  onRetry,
  extractWidgetRef,
}: {
  locale: Locale;
  files: readonly File[];
  errors: readonly RfqFileError[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** W13.3: attached lists are read into the rows above. */
  readsLists?: boolean;
  /** W13.3: the reading status of each file (same order as `files`). */
  statuses?: readonly (ExtractStatus | null)[];
  onRemoveRows?: (index: number) => void;
  onRetry?: (index: number) => void;
  /** Where the invisible rfq_extract Turnstile widget renders (it shows only if Cloudflare asks for a challenge). */
  extractWidgetRef?: RefObject<HTMLDivElement | null>;
}) {
  const t = copy[locale];
  const inputRef = useRef<HTMLInputElement>(null);
  const full = files.length >= MAX_RFQ_FILES;

  return (
    <div className="border-border bg-surface min-w-0 rounded-[var(--aa-radius-lg)] border p-6 sm:p-8" data-rfq-files="">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-navy text-base font-bold" id="rfq-files-title">
            {t.title} <span className="text-muted-foreground text-sm font-normal">({t.optional})</span>
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed" id="rfq-files-help">
            {t.body}
          </p>
          {readsLists && <p className="text-navy mt-1 text-sm leading-relaxed">{t.readsLists}</p>}
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed" dir="auto">
            {t.formats}
          </p>
        </div>
        <span className="bg-navy shrink-0 rounded-[var(--aa-radius-badge)] px-4 py-1.5 text-xs font-bold text-white" aria-live="polite">
          {t.counter(files.length, MAX_RFQ_FILES)}
        </span>
      </div>

      {files.length > 0 && (
        <ul className="mt-5 grid gap-2" aria-labelledby="rfq-files-title">
          {files.map((file, index) => {
            const status = statuses[index] ?? null;
            return (
              <li key={`${file.name}-${file.size}-${index}`} className="border-border grid min-w-0 gap-2 rounded-[var(--aa-radius-control)] border px-4 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="text-copper size-4 shrink-0" aria-hidden="true" />
                  <span className="text-navy min-w-0 flex-1 truncate" dir="auto">
                    {file.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs" dir="ltr">
                    {formatFileSize(file.size)}
                  </span>
                  <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => onRemove(index)} aria-label={t.remove(file.name)}>
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                {status && <ReadingStatus status={status} t={t} disabled={disabled} onRetry={onRetry ? () => onRetry(index) : undefined} onRemoveRows={onRemoveRows ? () => onRemoveRows(index) : undefined} />}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          id="rfq-files"
          type="file"
          multiple
          accept={RFQ_FILE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const picked = Array.from(e.currentTarget.files ?? []);
            // Reset, so choosing the same file again (after removing it) fires onChange again.
            e.currentTarget.value = "";
            if (picked.length) onAdd(picked);
          }}
        />
        <Button type="button" variant="secondary" className="border-dashed" disabled={disabled || full} onClick={() => inputRef.current?.click()} aria-describedby="rfq-files-help">
          <Paperclip className="size-4" aria-hidden="true" />
          {t.choose}
        </Button>
        <a href={ITEM_LIST_TEMPLATE_PATH(locale)} download className="text-copper inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-1 underline-offset-4 hover:decoration-2" data-rfq-template="">
          <Download className="size-4" aria-hidden="true" />
          {t.template}
        </a>
      </div>

      {files.length > 0 && <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{t.notKept}</p>}

      {/* W13.3: the rfq_extract Turnstile widget — invisible unless Cloudflare needs the visitor to interact. */}
      {readsLists && <div ref={extractWidgetRef} className="mt-3 empty:hidden" />}

      {errors.length > 0 && (
        <div role="alert" className="border-[var(--aa-color-danger-700)] bg-[var(--aa-color-danger-50)] mt-5 rounded-[var(--aa-radius-control)] border p-4">
          <ul className="grid gap-1 text-sm text-[var(--aa-color-danger-700)]">
            {errors.map((error, i) => (
              <li key={`${error.name}-${error.reason}-${i}`}>
                {error.name ? (
                  <>
                    <bdi className="font-semibold">{error.name}</bdi>: {t.errors[error.reason]}
                  </>
                ) : (
                  t.errors[error.reason]
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type FieldCopy = (typeof copy)[Locale];

/** W13.3: one file's reading state, announced politely (aria-live) while it changes. */
function ReadingStatus({ status, t, disabled, onRetry, onRemoveRows }: { status: ExtractStatus; t: FieldCopy; disabled: boolean; onRetry?: () => void; onRemoveRows?: () => void }) {
  const link = "text-copper inline-flex min-h-11 items-center gap-1 justify-self-start text-xs font-semibold underline decoration-1 underline-offset-4 hover:decoration-2 disabled:opacity-50";
  return (
    <div role="status" aria-live="polite" className="grid gap-1 text-xs leading-relaxed" data-rfq-extract={status.state}>
      {status.state === "reading" && (
        <p className="text-navy flex items-center gap-2">
          <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {t.reading}
        </p>
      )}
      {status.state === "done" && (
        <>
          <p className="text-navy flex items-start gap-2">
            <CheckCircle2 className="text-copper mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {t.done(status.added, status.review)}
              {status.overflow > 0 && <> {t.overflow(status.overflow)}</>}
            </span>
          </p>
          {onRemoveRows && status.added > 0 && (
            <button type="button" className={link} disabled={disabled} onClick={onRemoveRows}>
              {t.removeRows}
            </button>
          )}
        </>
      )}
      {status.state === "empty" && <p className="text-muted-foreground">{t.empty}</p>}
      {status.state === "failed" && (
        <>
          <p className="flex items-start gap-2 text-[var(--aa-color-warning-800)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t.failed[status.reason]}</span>
          </p>
          {onRetry && status.reason !== "unsupported" && (
            <button type="button" className={link} disabled={disabled} onClick={onRetry}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t.retry}
            </button>
          )}
        </>
      )}
    </div>
  );
}
