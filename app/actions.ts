'use server'
import { supabase } from '@/lib/supabase'

export async function getShipments() {
  // Guard missing env to avoid runtime fetch errors in dev/preview
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase env vars missing. Returning empty data set.")
    return []
  }

  console.log("--- STARTING UNLIMITED FETCH ---")
  
  let allRows: any[] = []
  let from = 0
  const batchSize = 1000 // Safe API limit per request
  let keepFetching = true

  while (keepFetching) {
    const to = from + batchSize - 1
    
    // Fetch chunk
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .range(from, to)

      if (error) {
        console.error('Fetch Error:', error)
        break
      }

      if (data && data.length > 0) {
        allRows = [...allRows, ...data]
        console.log(`Fetched rows ${from} to ${from + data.length - 1}`)
        from += batchSize
        
        // If we got fewer rows than requested, we are at the end
        if (data.length < batchSize) {
          keepFetching = false
        }
      } else {
        keepFetching = false
      }
    } catch (err) {
      console.error("Fetch Error: Unexpected failure", err)
      break
    }
  }

  console.log(`--- COMPLETE: Fetched ${allRows.length} Total Rows ---`)

  // Normalize to Uppercase
  const normalizedData = allRows.map(row => {
    const newRow: any = {}
    Object.keys(row).forEach(key => {
      newRow[key.toUpperCase()] = row[key]
    })
    return newRow
  })

  // --- DEMO MODE: JULES & SNC BIZZBEE ONE ---
  // 1. Find Top 2 Clients
  const clientCounts: Record<string, number> = {};
  normalizedData.forEach(row => {
    const client = row.CONNAME || 'UNKNOWN';
    clientCounts[client] = (clientCounts[client] || 0) + 1;
  });
  
  const topClients = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(c => c[0]);
    
  // 2. Rename & Filter
  const demoData = normalizedData
    .filter(row => {
        const c = row.CONNAME || 'UNKNOWN';
        return topClients.includes(c);
    })
    .map(row => {
        const c = row.CONNAME || 'UNKNOWN';
        let newName = c;
        if (c === topClients[0]) newName = "JULES";
        else if (c === topClients[1]) newName = "SNC BIZZBEE ONE";
        
        return { ...row, CONNAME: newName };
    });

  // Safety Fallback: If filtering resulted in 0 rows (unlikely but possible if empty DB), return all data
  if (demoData.length === 0) {
      console.warn("Demo filter resulted in 0 rows. Returning full dataset.");
      return normalizedData;
  }

  return demoData;
}