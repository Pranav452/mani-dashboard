'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FullScreenCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  cardType: string
  data: any
  chartComponent?: React.ReactNode
  detailsComponent?: React.ReactNode
}

export function FullScreenCardModal({
  open,
  onOpenChange,
  title,
  description,
  cardType,
  data,
  chartComponent,
  detailsComponent
}: FullScreenCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="chart" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-auto px-6 py-4">
              <TabsContent value="chart" className="mt-4 h-full">
                <div className="h-[calc(95vh-200px)]">
                  {chartComponent || <div className="text-slate-500 dark:text-slate-400">Chart view not available</div>}
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                {detailsComponent || <div className="text-slate-500 dark:text-slate-400">Details view not available</div>}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
