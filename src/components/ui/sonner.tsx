"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CircleCheckIcon className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        info: (
          <span className="flex size-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
            <InfoIcon className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        warning: (
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <TriangleAlertIcon className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        error: (
          <span className="flex size-6 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
            <OctagonXIcon className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        loading: (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
            <Loader2Icon className="size-3.5 animate-spin stroke-[2.5]" />
          </span>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:font-sans group-[.toaster]:gap-3",
          title: "text-[13.5px] font-extrabold text-foreground leading-snug",
          description: "text-[12px] font-medium text-muted-foreground leading-relaxed mt-0.5",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:shadow-sm group-[.toast]:hover:bg-primary/90 transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs hover:group-[.toast]:bg-muted/80 transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

