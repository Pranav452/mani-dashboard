export default function ReportsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">
        <div className="animate-pulse">
          <div className="h-16 bg-white rounded-xl mb-5"></div>
          <div className="h-12 bg-white rounded-xl mb-5"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-xl"></div>
            <div className="h-80 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
