"use client";

import { useRef } from "react";
import { FileText, Download, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/locales";
import { ITEM_LIST_TEMPLATE_PATH, MAX_RFQ_FILES, RFQ_FILE_ACCEPT, type RfqFileRejection } from "@/lib/rfq/attachment-policy";
import { formatFileSize } from "@/lib/rfq/attachment-notes";

/**
 * «بارگذاری لیست اقلام» — the optional file field of the RFQ form
 * (owner decision D-RFQ-FILE; docs/RFQ_FILE_UPLOAD.md). Same card, label,
 * button and message styles as the rest of the form (W10.2/W10.3). Rendered
 * by EnquiryForm only when the RFQ Worker reports upload as enabled, so the
 * prerendered page (identical on staging and production, r4) has no field.
 *
 * Files never leave the browser before the RFQ is accepted, are never kept in
 * storage (a reload or «ادامه انتخاب محصول» drops them), and nothing from a
 * file is ever shown back except its name and size.
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
  }
> = {
  fa: {
    title: "بارگذاری لیست اقلام",
    optional: "اختیاری",
    body: "اگر لیست خرید، فاکتور یا عکس لیست اقلام دارید، آن را در کنار ردیف‌های بالا پیوست کنید. حداکثر ۵ فایل، هر فایل تا ۱۵ مگابایت.",
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
  },
  en: {
    title: "Upload your item list",
    optional: "optional",
    body: "Have a purchase list, an invoice or a photo of your list? Attach it here, alongside the rows above. Up to 5 files, 15 MB each.",
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
  },
  ar: {
    title: "تحميل قائمة الأصناف",
    optional: "اختياري",
    body: "هل لديك قائمة شراء أو فاتورة أو صورة لقائمتك؟ أرفقها هنا إلى جانب الصفوف أعلاه. حتى 5 ملفات، بحد أقصى 15 ميغابايت لكل ملف.",
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
  },
};

export function RfqFilesField({
  locale,
  files,
  errors,
  disabled,
  onAdd,
  onRemove,
}: {
  locale: Locale;
  files: readonly File[];
  errors: readonly RfqFileError[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
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
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="border-border flex min-w-0 items-center gap-3 rounded-[var(--aa-radius-control)] border px-4 py-2.5 text-sm">
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
            </li>
          ))}
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
