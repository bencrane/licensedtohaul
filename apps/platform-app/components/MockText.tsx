export function MockText({
  children,
  tooltip = "Not yet wired to real data",
  className = "",
}: {
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}) {
  return (
    <span className={`text-red-600 ${className}`} title={tooltip} data-mock="true">
      {children}
    </span>
  );
}
