import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import * as SelectPrimitive from "@kobalte/core/select"
import type { ValidComponent } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export const SelectListbox = SelectPrimitive.Listbox
export const SelectHiddenSelect = SelectPrimitive.HiddenSelect

type SelectTriggerProps<T extends ValidComponent = "button"> = SelectPrimitive.SelectTriggerProps<T> & {
  class?: string
  children?: any
}

export const SelectTrigger = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SelectTriggerProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectTriggerProps, ["class", "children"])
  return (
    <SelectPrimitive.Trigger
      class={cn(
        "flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50",
        "focus:outline-none focus:ring-1 focus:ring-zinc-300",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <SelectPrimitive.Icon>
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="h-3 w-3 shrink-0 text-zinc-500">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

type SelectContentProps<T extends ValidComponent = "div"> = SelectPrimitive.SelectContentProps<T> & {
  class?: string
}

export const SelectContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectContentProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectContentProps, ["class"])
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        class={cn(
          "z-50 overflow-hidden rounded-lg bg-white/95 p-1 shadow-lg ring-1 ring-zinc-200/50 backdrop-blur",
          "data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
          "data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95",
          local.class,
        )}
        {...others}
      >
        <SelectPrimitive.Listbox />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

type SelectItemProps<T extends ValidComponent = "li"> = SelectPrimitive.SelectItemProps<T> & {
  class?: string
  children?: any
}

export const SelectItem = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, SelectItemProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectItemProps, ["class", "children"])
  return (
    <SelectPrimitive.Item
      class={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-7 text-xs text-zinc-700 outline-none transition-colors",
        "data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900",
        "data-[selected]:font-medium data-[selected]:text-zinc-900",
        local.class,
      )}
      {...others}
    >
      <SelectPrimitive.ItemIndicator class="absolute right-1.5 flex h-3.5 w-3.5 items-center justify-center">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="h-3 w-3">
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clip-rule="evenodd"
          />
        </svg>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemLabel>{local.children}</SelectPrimitive.ItemLabel>
    </SelectPrimitive.Item>
  )
}
