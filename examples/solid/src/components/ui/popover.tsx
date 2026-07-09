import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import * as PopoverPrimitive from "@kobalte/core/popover"
import type { Component, ValidComponent } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export const Popover: Component<PopoverPrimitive.PopoverRootProps> = (props) => {
  return <PopoverPrimitive.Root gutter={4} {...props} />
}

export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export type PopoverContentProps<T extends ValidComponent = "div"> = PopoverPrimitive.PopoverContentProps<T> & {
  class?: string
}

export const PopoverContent = <T extends ValidComponent = "div">(props: PolymorphicProps<T, PopoverContentProps<T>>) => {
  const [local, others] = splitProps(props as PopoverContentProps, ["class"])

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn(
          "z-50 origin-[var(--kb-popover-content-transform-origin)] rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-md outline-none",
          "data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
          "data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95",
          local.class,
        )}
        {...others}
      />
    </PopoverPrimitive.Portal>
  )
}
