import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 px-5 py-3",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 px-5 py-3",
  /** Nút sáng trên nền hero teal đậm */
  inverse: "bg-white text-teal-900 hover:bg-teal-50 hover:text-teal-950 px-5 py-3",
  ghost: "text-teal-700 hover:bg-teal-50 px-3 py-2",
  danger: "bg-rose-600 text-white hover:bg-rose-700 px-5 py-3",
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}