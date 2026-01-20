'use client'

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { LogOut } from "lucide-react"
import { usePathname } from "next/navigation"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const username = session?.user?.email || session?.user?.name || 'User'

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 relative">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-50">
              Management Dashboard
              <span className="text-[13px] font-bold text-red-700 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/50 dark:text-red-400">
                For {username.toUpperCase()}
              </span>
            </h1>
            <span className="text-[13px] text-blue-500 dark:text-blue-400 font-normal">by Manilal Patel</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className={`font-medium ${isActive('/dashboard') ? 'text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className={`font-medium ${isActive('/financials') ? 'text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
          >
            <Link href="/financials">Financials</Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className={`font-medium ${isActive('/environmental') ? 'text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
          >
            <Link href="/environmental">Environmental</Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className={`font-medium ${isActive('/tracking') ? 'text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}
          >
            <Link href="/tracking">Track & Trace</Link>
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <ModeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
