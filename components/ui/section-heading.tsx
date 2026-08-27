import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  invert = false,
  align = "start",
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  invert?: boolean;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      <p
        className={cn(
          "eyebrow flex items-center gap-3",
          align === "center" && "justify-center",
          invert ? "text-copper-400" : "text-copper",
        )}
      >
        <span className="h-px w-6 bg-current" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-5 text-3xl leading-[1.1] font-bold sm:text-4xl lg:text-[2.75rem]",
          invert ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {body && (
        <p className={cn("mt-5 text-base leading-relaxed", invert ? "text-white/60" : "text-muted-foreground")}>
          {body}
        </p>
      )}
    </div>
  );
}
