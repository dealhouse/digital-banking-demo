import * as React from "react";

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="text-sm font-medium text-slate-700">{children}</div>;
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-slate-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}


export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white",
        "hover:bg-slate-800 disabled:opacity-50",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function GhostButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900",
        "hover:bg-slate-50 disabled:opacity-50",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function Alert({
  variant = "info",
  children,
}: {
  variant?: "info" | "error";
  children: React.ReactNode;
}) {
  const base =
    "rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap break-words";
  const styles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return <div className={`${base} ${styles}`}>{children}</div>;
}
