import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"
