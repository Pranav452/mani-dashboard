'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Ship, Box, Clock, MapPin, FileText, Calendar, Package, Truck, Anchor, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parse, isValid } from "date-fns"
import { parseDateValue } from "@/lib/dashboard-logic"
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

  const getSafeDate = (val: any) => {
    const d = parseDateValue(val)
    return d && isValid(d) ? d : null
  }

  const renderDateValue = (val: any) => {
    const d = getSafeDate(val)
    if (d) return format(d, 'dd MMM yyyy')
    if (typeof val === 'string' && val.trim().length > 0) return val
    return "-"
  }

  const isSea = (record._mode || record.MODE) !== 'AIR'
  const cbm = cleanNum(record.CONT_CBM)
  const cbmCap = cleanNum(record.CONT_CBMCAP)
  const utilization = cbmCap > 0 ? (cbm / cbmCap) * 100 : cleanNum(record.CONT_UTILIZATION)
  const flag = String(record.DIRECTVSL || '').trim().toUpperCase()
  const routing = flag === 'YES' ? 'Direct' : flag === 'NO' ? 'Transshipped' : '-'
  const atd = getSafeDate(record.ATD), ata = getSafeDate(record.ATA)
  const transitDays = atd && ata && ata >= atd ? Math.round((ata.getTime() - atd.getTime()) / 86400000) : null
  const co2 = cleanNum(record.CO2)

  const metricsData = [
    { name: 'Weight', value: (cleanNum(record.CONT_GRWT) / 1000).toFixed(2), unit: 'tons', icon: Box, color: '#10b981' },
    { name: 'TEU', value: cleanNum(record.CONT_TEU), unit: '', icon: Ship, color: '#2563eb' },
    { name: 'CBM', value: cbm.toFixed(2), unit: '', icon: Package, color: '#f59e0b' },
    { name: 'Utilization', value: utilization.toFixed(1), unit: '%', icon: Layers, color: '#9333ea' },
    { name: 'Transit', value: transitDays ?? '-', unit: transitDays !== null ? 'days' : '', icon: Clock, color: '#0ea5e9' },
    { name: 'CO₂', value: co2 ? co2.toFixed(1) : '-', unit: co2 ? 'kg' : '', icon: Anchor, color: '#16a34a' },
  ]

  const chartData = [
    { name: 'Gross wt (t)', value: cleanNum(record.CONT_GRWT) / 1000 },
    { name: 'Net wt (t)', value: cleanNum(record.CONT_NETWT) / 1000 },
    { name: 'TEU', value: cleanNum(record.CONT_TEU) },
    { name: 'CBM / 10', value: cbm / 10 },
  ]

  const timeline = [
    { label: 'Cargo received', val: record.CARGORECPT },
    { label: 'Approval', val: record.APPROVAL },
    { label: 'ETD', val: record.ETD },
    { label: 'ATD', val: record.ATD },
    { label: 'ETA', val: record.ETA },
    { label: 'ATA', val: record.ATA },
    { label: 'Delivery', val: record.DELIVERY },
  ]

  const exportRecord = () => {
    const rows = Object.entries(record).filter(([k]) => !k.startsWith('_') ).map(([k, v]) => `"${k}","${String(v ?? '').replace(/"/g, '""')}"`)
    const blob = new Blob([["Field,Value", ...rows].join("\n")], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `shipment_${record.JOBNO}.csv`
    a.click()
  }

  const Field = ({ label, value, mono, icon: Icon }: { label: string; value: any; mono?: boolean; icon?: any }) => (
    <div className="space-y-1">
      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      <div className={cn("text-sm text-slate-900 dark:text-slate-50 break-words", mono ? "font-mono" : "font-semibold")}>
        {value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '0' ? '-' : value}
      </div>
    </div>
  )

  const Section = ({ title, icon: Icon, children }: any) => (
    <Card className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-full sm:w-[600px] bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800">
        <DrawerHeader className="border-b border-slate-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DrawerTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">Shipment Details</DrawerTitle>
              <DrawerDescription className="mt-1 text-slate-500 dark:text-slate-400">
                <span className="font-mono text-sm">Job No: {record.JOBNO}</span>
                {record.SHPTSTATUS && <span className="ml-3 text-xs">· {record.SHPTSTATUS}</span>}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div data-lenis-prevent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Route hero */}
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 shadow-lg">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/60">
              <span>{record._mode || record.MODE || 'Shipment'}</span>
              <span className={cn("px-2 py-0.5 rounded-full border", flag === 'NO' ? "border-amber-400/60 text-amber-300" : "border-emerald-400/60 text-emerald-300")}>{routing === '-' ? (record.SHPTSTATUS || 'Status n/a') : routing}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-3xl font-bold tracking-tight">{record.POL || '—'}</div>
                <div className="text-xs text-white/60 truncate">{record.ORIGIN || 'Origin'}</div>
              </div>
              <div className="flex-1 flex items-center">
                <div className="h-px flex-1 bg-white/30" />
                {isSea ? <Ship className="w-5 h-5 mx-2 text-emerald-300" /> : <Truck className="w-5 h-5 mx-2 text-emerald-300" />}
                <div className="h-px flex-1 bg-white/30" />
              </div>
              <div className="min-w-0 text-right">
                <div className="text-3xl font-bold tracking-tight">{record.POD || '—'}</div>
                <div className="text-xs text-white/60">Destination</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-white/70 truncate">{(isSea ? (record.LINER_NAME || record._carrier) : (record.AIRLINENAME || record.LINER_NAME)) || 'Carrier n/a'}{(record.VSL_NAME && isSea) ? ` · ${record.VSL_NAME}` : ''}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {metricsData.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.name} className="border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${metric.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: metric.color }} />
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{metric.name}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {metric.value} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{metric.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Volume Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Section title="Basic Information" icon={FileText}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Client" value={record.CONNAME} />
              <Field label="Shipper" value={record.SHIPPER} />
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mode</label>
                <div className="mt-1">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium inline-block",
                    record._mode === "SEA" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                    record._mode === "AIR" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" :
                    record._mode === "SEA-AIR" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                    "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300"
                  )}>{record._mode || record.MODE || "Unknown"}</span>
                </div>
              </div>
              <Field label="Office" value={record._office} />
              <Field label="Consol Job" value={record.CONSJOB} mono />
              <Field label="Client Code" value={record.CONCODE} mono />
            </div>
          </Section>

          <Section title="Routing & Carrier" icon={MapPin}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Origin (POL)" value={record.POL} icon={MapPin} />
              <Field label="Destination (POD)" value={record.POD} icon={MapPin} />
              <Field label="Origin Country/City" value={[record.ORIGIN, record.CITYCODE].filter(Boolean).join(' / ')} />
              <Field label={isSea ? "Carrier (Liner)" : "Airline"} value={isSea ? (record.LINER_NAME || record._carrier) : (record.AIRLINENAME || record.LINER_NAME)} icon={Ship} />
              {isSea && <Field label="Routing" value={routing} />}
              {isSea && <Field label="Vessel" value={record.VSL_NAME || record.CONT_VESSEL} />}
              <Field label="Move Type" value={record.CONT_MOVETYPE} />
              <Field label="Voyage / Ref" value={record.CONT_VESSEL} mono />
            </div>
          </Section>

          <Section title="Dates & Timeline" icon={Calendar}>
            <ol className="relative border-l-2 border-slate-200 dark:border-zinc-700 ml-2 space-y-4">
              {timeline.map(t => {
                const d = getSafeDate(t.val)
                const done = !!d && d <= new Date()
                return (
                  <li key={t.label} className="pl-5 relative">
                    <span className={cn("absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900", d ? (done ? "bg-emerald-500" : "bg-sky-500") : "bg-slate-300 dark:bg-zinc-600")} />
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{t.label}</span>
                      <span className={cn("font-semibold", d ? "text-slate-900 dark:text-slate-50" : "text-slate-400")}>{renderDateValue(t.val)}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Transit (ATD → ATA)</span>
              <span className="font-bold text-slate-900 dark:text-slate-50">{transitDays !== null ? `${transitDays} days` : '-'}</span>
            </div>
          </Section>

          <Section title="Cargo & Container" icon={Truck}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Container Size" value={record.CONT_CONTSIZE} />
              <Field label="Container Status" value={record.CONT_CONTSTATUS} />
              <Field label="Gross Weight" value={`${cleanNum(record.CONT_GRWT).toLocaleString()} kg`} />
              <Field label="Net Weight" value={cleanNum(record.CONT_NETWT) ? `${cleanNum(record.CONT_NETWT).toLocaleString()} kg` : '-'} />
              <Field label="Chargeable Weight" value={cleanNum(record.ORD_CHBLWT) ? `${cleanNum(record.ORD_CHBLWT).toLocaleString()} kg` : '-'} />
              <Field label="Container CBM Capacity" value={cbmCap || '-'} />
              <Field label="Order CBM" value={cleanNum(record.ORD_CBM) || '-'} />
              <Field label="Order Gross Wt" value={cleanNum(record.ORD_GRWT) ? `${cleanNum(record.ORD_GRWT).toLocaleString()} kg` : '-'} />
            </div>
          </Section>

          <Section title="References & Documents" icon={FileText}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Order Number" value={record.ORDERNO} mono />
              <Field label={isSea ? "Container / MAWB" : "HAWB / MAWB"} value={record.CONTMAWB} mono />
              <Field label="MAWB No" value={record.MAWBNO} mono />
              <Field label="Airline Code" value={record.AIRLINECD} mono />
              <Field label="Document Received" value={renderDateValue(record.DOCRECD)} />
              <Field label="Document Date" value={renderDateValue(record.DOCDT)} />
              <Field label="Status" value={record.SHPTSTATUS} />
              <Field label="Sea-Air Indicator" value={record.ISDIFFAIR === '2' ? 'Sea-Air' : null} />
            </div>
          </Section>

          {(record.INVNO || cleanNum(record.INVVAL) > 0) && (
            <Section title="Invoice" icon={FileText}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Invoice No" value={record.INVNO} mono />
                <Field label="Invoice Value" value={cleanNum(record.INVVAL).toLocaleString()} />
              </div>
            </Section>
          )}
        </div>

        <DrawerFooter className="border-t border-slate-200 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-950">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild className="flex-1">
              <Button variant="outline" className="w-full border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 dark:text-slate-100">Close</Button>
            </DrawerClose>
            <Button onClick={exportRecord} className="flex-1 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">Export Details</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
