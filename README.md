# Mani Dashboard

Logistics analytics dashboard with search, export, KPIs, and recent shipment insights.

## Status
- Chat page temporarily disabled; AI Analyst button is inactive for now.
- Dashboard fully available.

## Features
1. **Global Search Bar**  
   - Filters by Job No, Container No, BL No, Booking No, Carrier, Provider, POL, POD, and Order No.  
   - Real-time filtering across all data.

2. **Export to CSV Button**  
   - Exports filtered data with columns: JOBNO, MODE, PROVIDER, CARRIER, POL, POD, ETD, ATD, WEIGHT_KG, TEU, CBM, BOOKNO, CONNO, BLNO.  
   - Filename includes a timestamp.

3. **Transit Time Metric**  
   - Calculates average transit days from ETD to ATD.  
   - Displayed in a KPI card with a clock icon.

4. **Enhanced Recent Shipments Table**  
   - Includes Job No column for quick reference.  
   - Clickable rows open shipment detail drawer (Dashboard).

5. **Updated Reset Button**  
   - Clears all filters including search query.

6. **Charts & Stats**  
   - Volume trend, mode split, top origins/destinations, carriers, clients, lanes, and mode over time.  
   - Map with ports when available.

## Usage
1. Apply filters (mode, provider, date range) and use the global search to narrow data.  
2. Review KPIs and charts for performance insights.  
3. Export current filtered view via the Export button.  
4. Click recent shipments to view details in the drawer.

## Notes
- AI Analyst chat is paused; the button is disabled until the chat page is re-enabled.  
- No server start/build included here per project rules.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
