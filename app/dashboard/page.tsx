'use client'

import { Suspense, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useShipments } from '@/components/ShipmentContext'
import { DashboardFilterPanel } from '@/components/DashboardFilterPanel'
import Snowfall from 'react-snowfall'

function DashboardWrapper() {
  const { data, loading, filters, setFilters, applyFilters } = useShipments()
  const [showSnow, setShowSnow] = useState(false)
  
  if (loading) return <DashboardSkeleton />
  
  const handleExport = () => {
    if (!data?.rawShipments?.length) return
    
    const headers = ["JOBNO", "MODE", "PROVIDER", "CARRIER", "POL", "POD", "ETD", "ATD", "WEIGHT_KG", "TEU", "CBM"]
    
    const csvContent = [
      headers.join(","),
      ...data.rawShipments.map(row => [
        row.JOBNO || "",
        row.MODE || "",
        `"${(row.CONNAME || "").replace(/"/g, '""')}"`,
        `"${(row.LINER_NAME || "").replace(/"/g, '""')}"`,
        row.POL || "",
        row.POD || "",
        row.ETD || "",
        row.ATD || "",
        row.CONT_GRWT || 0,
        row.CONT_TEU || 0,
        row.CONT_CBM || 0
      ].join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    link.download = `dashboard_export_${timestamp}.csv`
    link.click()
  }
  
  return (
    <>
      {showSnow && (
        <Snowfall
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
          }}
          snowflakeCount={200}
        />
      )}
      
      <DashboardFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onApply={applyFilters}
        onExport={handleExport}
        clientGroups={data?.clientGroups || []}
        loading={loading}
        showSnow={showSnow}
        onToggleSnow={() => setShowSnow(!showSnow)}
      />
      
      <Dashboard data={data} />
    </>
  )
}

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardWrapper />
      </Suspense>
    </main>
  )
}
