'use client'

import { PremiumPageShell } from "@/components/PremiumPageShell"

// NOTE: Fleet is currently a placeholder. Once a `fleet` table or API exists,
// this page should be wired to real data (e.g. Supabase query) instead of mocks.

export default function FleetPage() {
  return (
    <PremiumPageShell
      title="Fleet Management"
      description="Real-time fleet tracking, utilization, and route health."
      sections={[
        {
          title: "Fleet Overview",
          content: (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-center text-sm text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-100 mb-2">
                No Fleet Data Connected
              </div>
              <p className="max-w-md mx-auto">
                Connect a fleet data source (e.g. `fleet` table in your database or an external TMS API) to power this workspace.
                All tiles and tables on this page will reflect exactly what the backend returns.
              </p>
            </div>
          )
        }
      ]}
      active="fleet"
      columns={1}
    />
  )
}
