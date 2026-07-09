import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export type InputProps = ComponentProps<"input">

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return (
    <input
      class={cn(
        "flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  )
}
