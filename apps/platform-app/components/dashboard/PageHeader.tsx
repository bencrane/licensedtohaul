type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: Props) {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              {eyebrow}
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight text-stone-900 md:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
                {description}
              </p>
            )}
            {meta && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-600">
                {meta}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 md:flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </section>
  );
}
