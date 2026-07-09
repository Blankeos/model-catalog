import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

type Variant = "default" | "secondary" | "outline"

const variants: Record<Variant, string> = {
  default: "border-transparent bg-zinc-900 text-zinc-50",
  secondary: "border-transparent bg-zinc-100 text-zinc-700",
  outline: "border-zinc-200 bg-white text-zinc-600",
}

type BadgeProps = ComponentProps<"div"> & {
  variant?: Variant
}

export const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "variant"])
  return (
    <div
      class={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        variants[local.variant ?? "secondary"],
        local.class,
      )}
      {...others}
    />
  )
}
