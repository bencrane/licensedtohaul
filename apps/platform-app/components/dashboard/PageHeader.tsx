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
      <div className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              {eyebrow}
            </p>
            <h1 className="font-display mt-1 text-2xl leading-tight text-stone-900">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">
                {description}
              </p>
            )}
            {meta && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
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
