"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Coming Soon Tooltip - Specialized component for unavailable features
const ComingSoonTooltip = ({
  children,
  message = "Coming Soon",
  disabled = false
}: {
  children: React.ReactNode
  message?: string
  disabled?: boolean
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "relative",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}>
          {children}
          {disabled && (
            <div className="absolute inset-0 bg-slate-100/50 rounded-md flex items-center justify-center">
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm border">
                N/A
              </span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{message}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, ComingSoonTooltip }
