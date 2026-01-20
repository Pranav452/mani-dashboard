'use client'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 mt-12">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">Manilal Patel</span>
          </div>
          <div className="text-center">
            © {currentYear} Management Dashboard. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
