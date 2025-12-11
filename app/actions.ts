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

  return normalizedData
}