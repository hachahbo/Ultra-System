import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-xl border p-4 text-start text-sm backdrop-blur-sm transition-all shadow-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pe-20 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-card/95 border-border/80 text-foreground border-l-4 border-l-primary/80 shadow-sm",
        info:
          "bg-blue-500/10 border-blue-500/25 border-l-4 border-l-blue-500 text-blue-950 dark:text-blue-100 *:[svg]:text-blue-600 dark:*:[svg]:text-blue-400 *:data-[slot=alert-description]:text-blue-900/80 dark:*:data-[slot=alert-description]:text-blue-200/80",
        success:
          "bg-emerald-500/10 border-emerald-500/25 border-l-4 border-l-emerald-500 text-emerald-950 dark:text-emerald-100 *:[svg]:text-emerald-600 dark:*:[svg]:text-emerald-400 *:data-[slot=alert-description]:text-emerald-900/80 dark:*:data-[slot=alert-description]:text-emerald-200/80",
        warning:
          "bg-amber-500/10 border-amber-500/25 border-l-4 border-l-amber-500 text-amber-950 dark:text-amber-100 *:[svg]:text-amber-600 dark:*:[svg]:text-amber-400 *:data-[slot=alert-description]:text-amber-900/80 dark:*:data-[slot=alert-description]:text-amber-200/80",
        destructive:
          "bg-destructive/10 border-destructive/25 border-l-4 border-l-destructive text-destructive dark:text-red-200 *:[svg]:text-destructive dark:*:[svg]:text-red-400 *:data-[slot=alert-description]:text-destructive/90 dark:*:data-[slot=alert-description]:text-red-300/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold text-[14.5px] leading-snug group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-[13px] leading-relaxed text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-2",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-3 end-3 flex items-center gap-1.5", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }

