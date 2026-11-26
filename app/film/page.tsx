import type { Metadata } from 'next'

const BASE = 'https://axbizmpelahizskuqfdn.supabase.co/storage/v1/object/public/marketing/dashboard-2-0'
const VIDEO = `${BASE}/film.mp4`
const THUMB = `${BASE}/thumb.jpg`
const POSTER = `${BASE}/poster.png`

const title = 'MP Cargo Dashboard 2.0'
const description = 'Every shipment. One clear view. Watch the 90-second tour of your redesigned MP Cargo dashboard.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'video.other',
    images: [{ url: THUMB, width: 1200, height: 630, alt: title }],
    videos: [{ url: VIDEO, secureUrl: VIDEO, type: 'video/mp4', width: 1920, height: 1080 }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [THUMB] },
}

export default function FilmPage() {
  return (
    <main className="min-h-screen bg-[#F4F4F2] text-[#0B0B0C]">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <div className="flex items-center justify-between border-b border-[#0B0B0C] pb-3 text-sm">
          <span className="font-semibold">MP Cargo</span>
          <span className="text-[#9A9A96]">Dashboard 2.0</span>
        </div>
        <h1 className="mt-10 text-4xl md:text-6xl font-bold tracking-tight leading-[1.02]">
          Every shipment. One clear view<span className="text-[#E5322D]">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[#5E5E5A]">
          Your MP Cargo dashboard, redesigned: faster, cleaner, with transshipment insight, richer shipment details,
          financial and CO₂ reports, and one-click export.
        </p>
        <div className="mt-8 overflow-hidden rounded-xl bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]">
          <video src={VIDEO} poster={THUMB} controls playsInline preload="metadata" className="block w-full aspect-video" />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/login" className="rounded-md bg-[#0B0B0C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
            Log in to your dashboard
          </a>
          <a href={POSTER} target="_blank" rel="noreferrer" className="rounded-md border border-[#0B0B0C] px-5 py-2.5 text-sm font-semibold hover:bg-white">
            View overview poster
          </a>
        </div>
        <p className="mt-12 text-xs text-[#9A9A96]">Figures shown in the film are illustrative.</p>
      </div>
    </main>
  )
}
