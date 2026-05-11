import { ReactNode } from "react";

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function Field({ name, label, hint, error, required, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600"
      >
        {label}
        {required && <span className="ml-1 text-orange-600">*</span>}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-stone-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-orange-700">{error}</p>
      )}
    </div>
  );
}

const baseInput =
  "w-full bg-white border border-line-strong px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all";

export function TextInput({
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
  invalid,
  inputMode,
}: {
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  invalid?: boolean;
  inputMode?: "text" | "numeric" | "email" | "tel";
}) {
  return (
    <input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      required={required}
      inputMode={inputMode}
      aria-invalid={invalid}
      className={`${baseInput} ${invalid ? "border-orange-500" : ""}`}
    />
  );
}

export function TextArea({
  name,
  placeholder,
  defaultValue,
  rows = 4,
  invalid,
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  invalid?: boolean;
}) {
  return (
    <textarea
      id={name}
      name={name}
      rows={rows}
      placeholder={placeholder}
      defaultValue={defaultValue}
      aria-invalid={invalid}
      className={`${baseInput} resize-none ${invalid ? "border-orange-500" : ""}`}
    />
  );
}
