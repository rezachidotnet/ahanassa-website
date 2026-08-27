"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { categories, sampleProducts } from "@/lib/content/catalog-sample";
import type { Locale } from "@/config/locales";

/**
 * RFQ intake form. Deliberately has no file upload — attachment handling
 * stays disabled until a scanning pipeline is selected
 * (PROJECT_OVERRIDES.md §7 item 8) — and does not claim a successful
 * submission: the durable D1-backed capture pipeline (CLAUDE.md §10) is not
 * built yet, so faking a "request received" state would misrepresent what
 * actually happened to the visitor's data. See DOCUMENT_AUDIT_REPORT.md
 * "v0 integration".
 */
const copy: Record<
  Locale,
  {
    name: string; company: string; email: string; phone: string; product: string; productPlaceholder: string; other: string;
    grade: string; gradePlaceholder: string; quantity: string; quantityPlaceholder: string; destination: string; destinationPlaceholder: string;
    message: string; messagePlaceholder: string; submit: string; notConnectedTitle: string; notConnectedBody: string; retry: string;
  }
> = {
  fa: {
    name: "نام و نام خانوادگی", company: "شرکت", email: "ایمیل کاری", phone: "تلفن",
    product: "محصول یا گروه کالایی", productPlaceholder: "یک گروه کالایی انتخاب کنید", other: "سایر / نامشخص",
    grade: "گرید یا استاندارد (در صورت وجود)", gradePlaceholder: "مثلاً B500B، S355JR",
    quantity: "مقدار تقریبی", quantityPlaceholder: "مثلاً 200 تن یا 500 عدد",
    destination: "محل تحویل", destinationPlaceholder: "شهر یا استان",
    message: "شرح نیاز پروژه", messagePlaceholder: "مشخصات، زمان‌بندی مورد نظر و هر جزئیات دیگری که کمک می‌کند.",
    submit: "ارسال برای بررسی",
    notConnectedTitle: "ثبت آنلاین هنوز به زیرساخت نهایی متصل نشده است.",
    notConnectedBody: "این بخش از سایت در حال تکمیل است. اطلاعات فرم شما در این نسخه ذخیره یا ارسال نمی‌شود؛ لطفاً فعلاً از طریق آدرس دفتر مرکزی درج‌شده در پایین صفحه با ما در تماس باشید.",
    retry: "ویرایش اطلاعات",
  },
  en: {
    name: "Full name", company: "Company", email: "Work email", phone: "Phone",
    product: "Product or category", productPlaceholder: "Select a product category", other: "Other / unsure",
    grade: "Grade or standard (if known)", gradePlaceholder: "e.g. B500B, S355JR",
    quantity: "Approximate quantity", quantityPlaceholder: "e.g. 200 tons or 500 units",
    destination: "Delivery location", destinationPlaceholder: "City or region",
    message: "Project requirement", messagePlaceholder: "Specification, desired timing, and any other detail that helps.",
    submit: "Send for review",
    notConnectedTitle: "Online submission isn't connected to the production backend yet.",
    notConnectedBody: "This part of the site is still being finished. Nothing you enter here is saved or sent in this version — please use the head-office address at the bottom of the page in the meantime.",
    retry: "Edit information",
  },
  ar: {
    name: "الاسم الكامل", company: "الشركة", email: "البريد الإلكتروني للعمل", phone: "الهاتف",
    product: "المنتج أو الفئة", productPlaceholder: "اختر فئة منتج", other: "أخرى / غير محدد",
    grade: "الدرجة أو المعيار (إن وُجد)", gradePlaceholder: "مثال: B500B، S355JR",
    quantity: "الكمية التقريبية", quantityPlaceholder: "مثال: 200 طن أو 500 قطعة",
    destination: "موقع التسليم", destinationPlaceholder: "المدينة أو المنطقة",
    message: "وصف احتياج المشروع", messagePlaceholder: "المواصفات، التوقيت المطلوب، وأي تفاصيل أخرى مفيدة.",
    submit: "إرسال للمراجعة",
    notConnectedTitle: "الإرسال عبر الإنترنت غير متصل بعد بالبنية التحتية النهائية.",
    notConnectedBody: "هذا الجزء من الموقع ما زال قيد الإكمال. لا يتم حفظ أو إرسال ما تدخله هنا في هذا الإصدار؛ يرجى التواصل عبر عنوان المكتب الرئيسي أسفل الصفحة في الوقت الحالي.",
    retry: "تعديل المعلومات",
  },
};

const field =
  "w-full border border-border bg-background px-4 py-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-copper";
const label = "block text-[11px] font-bold uppercase tracking-[0.14em] text-navy";

export function EnquiryForm({ locale }: { locale: Locale }) {
  const [submitted, setSubmitted] = useState(false);
  const t = copy[locale];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="border-border bg-surface border p-10">
        <h3 className="text-navy text-xl font-bold">{t.notConnectedTitle}</h3>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">{t.notConnectedBody}</p>
        <Button variant="outline" className="mt-8" onClick={() => setSubmitted(false)}>
          {t.retry}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={label} htmlFor="name">{t.name}</label>
          <input id="name" name="name" required autoComplete="name" className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="company">{t.company}</label>
          <input id="company" name="company" required autoComplete="organization" className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="phone">{t.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={label} htmlFor="product">{t.product}</label>
          <select id="product" name="product" required className={field} defaultValue="">
            <option value="" disabled>{t.productPlaceholder}</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {sampleProducts.filter((p) => p.category === c.id).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </optgroup>
            ))}
            <option value="other">{t.other}</option>
          </select>
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="grade">{t.grade}</label>
          <input id="grade" name="grade" placeholder={t.gradePlaceholder} className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="quantity">{t.quantity}</label>
          <input id="quantity" name="quantity" placeholder={t.quantityPlaceholder} className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="destination">{t.destination}</label>
          <input id="destination" name="destination" placeholder={t.destinationPlaceholder} className={field} />
        </div>
      </div>

      <div className="grid gap-2">
        <label className={label} htmlFor="message">{t.message}</label>
        <textarea id="message" name="message" rows={5} placeholder={t.messagePlaceholder} className={`${field} resize-y`} />
      </div>

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <Button type="submit" size="lg">{t.submit}</Button>
      </div>
    </form>
  );
}
