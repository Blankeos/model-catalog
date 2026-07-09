import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

type Variant = "default" | "outline" | "ghost" | "secondary"
type Size = "default" | "sm" | "icon"

const variants: Record<Variant, string> = {
  default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-800",
  outline: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
}

const sizes: Record<Size, string> = {
  default: "h-9 px-3 text-sm",
  sm: "h-7 px-2.5 text-xs",
  icon: "h-8 w-8",
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant
  size?: Size
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "variant", "size"])
  return (
    <button
      class={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        variants[local.variant ?? "default"],
        sizes[local.size ?? "default"],
        local.class,
      )}
      {...others}
    />
  )
}
