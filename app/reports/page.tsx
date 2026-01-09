import { PremiumPageShell } from "@/components/PremiumPageShell"

// Reports are currently a pure shell. Once you have a reports backend,
// this page should render exactly what the backend returns (no mock tiles).

export default function ReportsPage() {
  const reports: any[] = [] // Placeholder for future real data

  return (
    <PremiumPageShell
      title="Reports"
      description="Reporting workspace."
      sections={[
        {
          title: "Report Library",
          content: (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-center text-sm text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-100 mb-2">
                No reports generated yet
              </div>
              <p className="max-w-md mx-auto">
                When your backend starts producing reports, they will appear here automatically.
                Until then, this page intentionally shows an empty state instead of mock data.
              </p>
            </div>
          )
        }
      ]}
      active="reports"
      columns={1}
    />
  )
}
