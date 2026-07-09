import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "../../lib/utils"

export const Card: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("rounded-xl border border-zinc-200 bg-white", local.class)} {...others} />
}

export const CardHeader: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex flex-col gap-0.5 px-3 py-2.5", local.class)} {...others} />
}

export const CardTitle: Component<ComponentProps<"h3">> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return <h3 class={cn("text-sm font-semibold leading-none tracking-tight", local.class)} {...others} />
}

export const CardDescription: Component<ComponentProps<"p">> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return <p class={cn("text-xs text-zinc-500", local.class)} {...others} />
}

export const CardContent: Component<ComponentProps<"div">> = (props) => {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("px-3 pb-3", local.class)} {...others} />
}
