import type { Metadata } from 'next'

const BASE = 'https://axbizmpelahizskuqfdn.supabase.co/storage/v1/object/public/marketing/links'
const VIDEO = `${BASE}/film.mp4`
const THUMB = `${BASE}/thumb.jpg`

const title = 'Links — Every shipment, linked.'
const description = 'One place for every shipment, lane and carrier. Watch the 90-second tour of the Links dashboard.'

export const metadata: Metadata = {
  metadataBase: new URL('https://mani-dashboard.vercel.app'),
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'video.other',
    url: '/links',
    images: [{ url: THUMB, width: 1200, height: 630, alt: 'Links' }],
    videos: [{ url: VIDEO, secureUrl: VIDEO, type: 'video/mp4', width: 1920, height: 1080 }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [THUMB] },
}

export default function LinksFilmPage() {
  return (
    <main className="min-h-screen bg-[#F3F5FA] text-[#0F1542]">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <div className="flex items-center justify-between border-b border-[#E3E7F1] pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkslogo.png" alt="Links" className="h-8 w-auto" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#7A84A8]">Product film</span>
        </div>
        <h1 className="mt-10 font-serif text-4xl md:text-6xl font-bold leading-[1.05] text-[#2D3688]">
          Every shipment, <span className="italic text-[#D33A35]">linked.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[#4A5275]">
          One place for every shipment, lane and carrier: live track &amp; trace, transit-time and transshipment
          insight, financials, CO₂ reporting and one-click export.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl bg-[#0F1542] shadow-[0_30px_80px_-30px_rgba(15,21,66,0.45)]">
          <video src={VIDEO} poster={THUMB} controls playsInline preload="metadata" className="block w-full aspect-video" />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/login" className="rounded-lg bg-[#2D3688] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232B70]">
            Log in to your dashboard
          </a>
        </div>
        <p className="mt-12 text-xs text-[#7A84A8]">Figures shown in the film are illustrative.</p>
      </div>
    </main>
  )
}
