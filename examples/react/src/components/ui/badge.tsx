import { type HTMLAttributes } from "react"
import { cn } from "../../lib/utils"

type Variant = "default" | "secondary" | "outline"

const variants: Record<Variant, string> = {
  default: "border-transparent bg-zinc-900 text-zinc-50",
  secondary: "border-transparent bg-zinc-100 text-zinc-700",
  outline: "border-zinc-200 bg-white text-zinc-600",
}

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
