type Tone = "cream" | "orange" | "ink" | "white";

const TONE_CLASS: Record<Tone, string> = {
  cream: "bg-background text-stone-900",
  orange: "bg-orange-600 text-white",
  ink: "bg-stone-900 text-stone-100",
  white: "bg-white text-stone-900",
};

const ACCENT_CLASS: Record<Tone, string> = {
  cream: "text-orange-700",
  orange: "text-orange-100",
  ink: "text-orange-400",
  white: "text-orange-700",
};

export default function WrappedCard({
  tone = "cream",
  eyebrow,
  number,
  numberUnit,
  headline,
  body,
  footer,
}: {
  tone?: Tone;
  eyebrow: string;
  number?: string;
  numberUnit?: string;
  headline: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section
      className={`relative flex min-h-[100svh] snap-start flex-col justify-center overflow-hidden px-6 py-20 ${TONE_CLASS[tone]}`}
    >
      {tone === "cream" && (
        <div aria-hidden className="absolute inset-0 paper-grid opacity-40" />
      )}
      <div className="relative mx-auto w-full max-w-4xl">
        <p
          className={`font-mono text-[11px] font-semibold uppercase tracking-[0.22em] ${ACCENT_CLASS[tone]}`}
        >
          {eyebrow}
        </p>

        {number && (
          <p className="font-display mt-6 text-7xl leading-[0.9] tracking-tight text-balance sm:text-8xl lg:text-[10rem]">
            {number}
            {numberUnit && (
              <span className="ml-3 text-2xl font-normal tracking-normal opacity-60 sm:text-3xl lg:text-4xl">
                {numberUnit}
              </span>
            )}
          </p>
        )}

        <div className="font-display mt-8 text-3xl leading-tight text-balance sm:text-4xl lg:text-5xl">
          {headline}
        </div>

        {body && (
          <div className="mt-6 max-w-2xl text-lg leading-relaxed opacity-85 sm:text-xl">
            {body}
          </div>
        )}

        {footer && (
          <div
            className={`mt-10 pt-6 border-t font-mono text-[11px] uppercase tracking-[0.16em] opacity-70 ${
              tone === "ink" || tone === "orange"
                ? "border-white/20"
                : "border-stone-300"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
