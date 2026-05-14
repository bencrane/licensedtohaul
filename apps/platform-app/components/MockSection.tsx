export function MockSection({
  children,
  tooltip = "Not yet wired to real data",
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="text-red-600 [&_*]:!text-red-600" title={tooltip} data-mock="true">
      {children}
    </div>
  );
}
