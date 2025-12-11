'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Ship, Box, Clock, MapPin, FileText, Calendar, Package, Truck, Anchor, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parse, isValid } from "date-fns"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts"

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

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']

export function ShipmentDrawer({ open, onOpenChange, record }: ShipmentDrawerProps) {
  if (!record) return null

  const getValidDate = (dateStr: any) => {
    if (!dateStr) return null
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parsed = parse(dateStr, 'dd-MM-yyyy', new Date())
      if (isValid(parsed)) return parsed
    }
    return null
  }

  const metricsData = [
    { name: 'Weight', value: (cleanNum(record.CONT_GRWT)/1000).toFixed(2), unit: 'tons', icon: Box, color: '#10b981' },
    { name: 'TEU', value: cleanNum(record.CONT_TEU), unit: '', icon: Ship, color: '#2563eb' },
    { name: 'CBM', value: cleanNum(record.CONT_CBM), unit: '', icon: Package, color: '#f59e0b' },
    { name: 'Utilization', value: cleanNum(record.CONT_UTILIZATION), unit: '%', icon: Layers, color: '#9333ea' },
  ]

  const chartData = [
    { name: 'Weight', value: cleanNum(record.CONT_GRWT) / 1000 },
    { name: 'TEU', value: cleanNum(record.CONT_TEU) },
    { name: 'CBM', value: cleanNum(record.CONT_CBM) / 10 },
  ]

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-full sm:w-[600px]">
        <DrawerHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DrawerTitle className="text-xl font-bold text-slate-900">Shipment Details</DrawerTitle>
              <DrawerDescription className="mt-1">
                <span className="font-mono text-sm text-slate-600">Job No: {record.JOBNO}</span>
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full"><X className="h-4 w-4" /></Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            {metricsData.map((metric, idx) => {
              const Icon = metric.icon
              return (
                <Card key={metric.name} className="border border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${metric.color}15` }}>
                        <Icon className="w-5 h-5" style={{ color: metric.color }} />
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{metric.name}</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {metric.value} <span className="text-sm font-normal text-slate-500">{metric.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Visual Metrics Chart */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Volume Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Provider</label>
                  <div className="font-semibold text-sm text-slate-900">{record.CONNAME || "Unknown"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Mode</label>
                  <div className="mt-1">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium inline-block",
                      record._mode === "SEA" ? "bg-blue-100 text-blue-700" :
                      record._mode === "AIR" ? "bg-purple-100 text-purple-700" :
                      record._mode === "SEA-AIR" ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {record._mode || record.MODE || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Origin (POL)
                  </label>
                  <div className="font-semibold text-sm text-slate-900">{record.POL || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Destination (POD)
                  </label>
                  <div className="font-semibold text-sm text-slate-900">{record.POD || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Ship className="w-3 h-3" /> Carrier
                  </label>
                  <div className="font-semibold text-sm text-slate-900">{record.LINER_NAME || record._carrier || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Office</label>
                  <div className="font-semibold text-sm text-slate-900">{record._office || "Unknown"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates & Timeline */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Dates & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Estimated Departure (ETD)</label>
                    <div className="text-sm font-semibold text-slate-900">{record.ETD || "-"}</div>
                    {getValidDate(record.ETD) && (
                      <div className="text-xs text-slate-400">{format(getValidDate(record.ETD)!, 'EEEE, MMMM dd, yyyy')}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Actual Departure (ATD)</label>
                    <div className="text-sm font-semibold text-slate-900">{record.ATD || "-"}</div>
                    {getValidDate(record.ATD) && (
                      <div className="text-xs text-slate-400">{format(getValidDate(record.ATD)!, 'EEEE, MMMM dd, yyyy')}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Estimated Arrival (ETA)</label>
                    <div className="text-sm font-semibold text-slate-900">{record.ETA || "-"}</div>
                    {getValidDate(record.ETA) && (
                      <div className="text-xs text-slate-400">{format(getValidDate(record.ETA)!, 'EEEE, MMMM dd, yyyy')}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">Actual Arrival (ATA)</label>
                    <div className="text-sm font-semibold text-slate-900">{record.ATA || "-"}</div>
                    {getValidDate(record.ATA) && (
                      <div className="text-xs text-slate-400">{format(getValidDate(record.ATA)!, 'EEEE, MMMM dd, yyyy')}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* References & Documents */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4" /> References & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Container Number</label>
                  <div className="text-sm font-mono text-slate-900">{record.CONNO || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Booking Number</label>
                  <div className="text-sm font-mono text-slate-900">{record.BOOKNO || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Bill of Lading (BL No)</label>
                  <div className="text-sm font-mono text-slate-900">{record.BLNO || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Master Airway Bill</label>
                  <div className="text-sm font-mono text-slate-900">{record.CONTMAWB || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Order Number</label>
                  <div className="text-sm font-mono text-slate-900">{record.ORDERNO || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Document Received Date</label>
                  <div className="text-sm text-slate-900">{record.DOCRECD || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Document Date</label>
                  <div className="text-sm text-slate-900">{record.DOCDT || "-"}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Status</label>
                  <div className="text-sm font-semibold text-slate-900">{record.SHPTSTATUS || "-"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          {(record.ISDIFFAIR || record.REMARKS) && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Additional Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {record.ISDIFFAIR && (
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Sea-Air Indicator</label>
                      <div className="text-sm text-slate-900">{record.ISDIFFAIR}</div>
                    </div>
                  )}
                  {record.REMARKS && (
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Remarks</label>
                      <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">{record.REMARKS}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DrawerFooter className="border-t sticky bottom-0 bg-white">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild className="flex-1">
              <Button variant="outline" className="w-full">Close</Button>
            </DrawerClose>
            <Button className="flex-1">Export Details</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

