import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Variantes específicas do jogo Preto ou Branco
        "game-black":
          "rounded-none border-2 border-[#0a0a0a] bg-[#0a0a0a] text-[#f5f5f5] font-black tracking-[0.3em] uppercase shadow-[3px_3px_0_rgba(245,245,245,0.15)] hover:shadow-[5px_5px_0_rgba(245,245,245,0.2)] hover:scale-[1.03] active:scale-[0.98]",
        "game-white":
          "rounded-none border-2 border-[#f5f5f5] bg-[#f5f5f5] text-[#0a0a0a] font-black tracking-[0.3em] uppercase shadow-[3px_3px_0_rgba(10,10,10,0.15)] hover:shadow-[5px_5px_0_rgba(10,10,10,0.2)] hover:scale-[1.03] active:scale-[0.98]",
        "game-outline":
          "rounded-none border-2 border-[rgba(245,245,245,0.3)] bg-transparent text-[#f5f5f5] font-extrabold tracking-[0.2em] uppercase hover:border-[rgba(245,245,245,0.7)]",
        "game-cta":
          "rounded-none border-[3px] border-[#0a0a0a] bg-[#f5f5f5] text-[#0a0a0a] font-extrabold tracking-[0.25em] uppercase shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
