'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const cleanNum = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  const str = String(val).replace(/,/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

interface ShipmentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: any
}

export function ShipmentDrawer({ open, onOpenChange, record }: ShipmentDrawerProps) {
  if (!record) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex justify-between items-center">
            <div>
              <DrawerTitle>Shipment Details</DrawerTitle>
              <DrawerDescription>Job No: {record.JOBNO}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon"><X className="h-4 w-4" /></Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium">Provider</label>
              <div className="font-semibold text-sm">{record.CONNAME || "Unknown"}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Mode</label>
              <div className="mt-1">
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  record._mode === "SEA" ? "bg-blue-100 text-blue-700" :
                  record._mode === "AIR" ? "bg-purple-100 text-purple-700" :
                  record._mode === "SEA-AIR" ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {record._mode || record.MODE || "Unknown"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Route</label>
              <div className="font-semibold text-sm">{record.POL} → {record.POD}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Weight</label>
              <div className="font-semibold text-sm">{(cleanNum(record.CONT_GRWT)/1000).toFixed(2)} tons</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <label className="text-xs text-slate-500">Utilization</label>
              <div className="font-mono text-sm">{cleanNum(record.CONT_UTILIZATION)}%</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">TEU</label>
              <div className="font-mono text-sm">{cleanNum(record.CONT_TEU)}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">CBM</label>
              <div className="font-mono text-sm">{cleanNum(record.CONT_CBM)}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Status</label>
              <div className="font-medium text-sm">{record.SHPTSTATUS || "-"}</div>
            </div>
          </div>

          {/* Dates & Refs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
            <div>
              <label className="text-xs text-slate-500">ETD</label>
              <div className="text-sm">{record.ETD || "-"}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">ATD</label>
              <div className="text-sm">{record.ATD || "-"}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Container</label>
              <div className="text-sm font-mono">{record.CONNO || "-"}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Booking</label>
              <div className="text-sm font-mono">{record.BOOKNO || "-"}</div>
            </div>
          </div>

          {/* Additional References */}
          {(record.BLNO || record.LINER_NAME) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
              {record.BLNO && (
                <div>
                  <label className="text-xs text-slate-500">BL No</label>
                  <div className="text-sm font-mono">{record.BLNO}</div>
                </div>
              )}
              {record.LINER_NAME && (
                <div>
                  <label className="text-xs text-slate-500">Carrier</label>
                  <div className="text-sm">{record.LINER_NAME}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

