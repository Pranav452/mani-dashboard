'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery, executeSP } from "@/lib/db"

export async function getShipments() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    console.warn("Unauthorized access attempt to getShipments")
    return { shipments: [], monthlyData: [] }
  }

  const { role, name } = session.user as any

  console.log(`--- FETCHING DATA FOR: ${name} (${role}) ---`)

  // --- DEMO MODE: Return mock data instead of querying database ---
  if (role === "DEMO") {
    console.log("DEMO MODE ACTIVE: Loading comprehensive mock data...")
    const { generateMockShipments } = await import("@/lib/mock-data")
    const mockData = generateMockShipments(1000) // Generate 1000 impressive shipments
    console.log(`Returned ${mockData.length} mock shipments for demo`)
    // Return in same format as real data (empty monthlyData for demo mode)
    return { shipments: mockData, monthlyData: [] }
  }

  try {
    // Use centralized stored procedure for all data fetching
    // This ensures consistency and simplifies maintenance
    // 1. FIX TRAILING SPACES (Crucial)
    const username = name ? name.trim() : 'HAPPYCHIC'

    console.log(`--- CALLING USP_CLIENT_DASHBOARD_PAGELOAD with username: '${username}' ---`)
    
    const query = `EXEC USP_CLIENT_DASHBOARD_PAGELOAD @p0, @p1`
    const params = [username, username]
    
    // Use executeSP to get all result sets (the stored procedure returns multiple tables)
    const resultSets = await executeSP(query, params)

    if (!resultSets || !Array.isArray(resultSets) || resultSets.length === 0) {
      console.log("--- WARNING: No result sets returned from stored procedure ---")
      return { shipments: [], monthlyData: [] }
    }

    // --- 2. DYNAMIC TABLE DETECTION ---
    // Don't rely on fixed indices like resultSets[2] and resultSets[4].
    // Instead, scan each table and infer its role from the column names.
    let shipmentData: any[] = []
    let monthlyData: any[] = []

    for (let i = 0; i < resultSets.length; i++) {
      const rs = resultSets[i]

      // Skip empty tables or scalar values (like counts)
      if (!rs || rs.length === 0) continue

      // Check column names of the first row
      const firstRow = rs[0]
      const columns = Object.keys(firstRow).map((k) => k.toUpperCase())

      // LOGIC: Identifying tables based on unique columns

      // A. Main Shipment Table usually has 'JOBNO' and 'MODE'
      if (columns.includes('JOBNO') && columns.includes('MODE')) {
        console.log(`>>> FOUND SHIPMENTS AT INDEX ${i} (${rs.length} rows) <<<`)
        shipmentData = rs
      }
      // B. Monthly Stats usually has 'TOTAL_TEU' or 'MONTH' (based on SQL)
      else if (columns.includes('TOTAL_TEU') || columns.includes('MONTH')) {
        console.log(`>>> FOUND MONTHLY STATS AT INDEX ${i} (${rs.length} rows) <<<`)
        monthlyData = rs
      }
    }

    console.log(`--- SHIPMENT ROWS FOUND: ${shipmentData.length} ---`)
    console.log(`--- MONTHLY DATA ROWS FOUND: ${monthlyData.length} ---`)

    if (shipmentData.length === 0) {
      console.log("--- WARNING: 0 Shipment rows found after scanning all tables ---")
      // It might be that the user simply has no shipment data within the date window.
    }

    // Normalize Keys to uppercase for consistency
    const normalizedData = shipmentData.map((row: any) => {
      const newRow: any = {}
      Object.keys(row).forEach(key => {
        // Remove any potential whitespace from keys and uppercase them
        const cleanKey = key.trim().toUpperCase()
        newRow[cleanKey] = row[key]
      })
      return newRow
    })

    // Normalize monthly data keys to uppercase
    const normalizedMonthlyData = monthlyData.map((row: any) => {
      const newRow: any = {}
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toUpperCase()
        newRow[cleanKey] = row[key]
      })
      return newRow
    })

    console.log(`--- PROCESSED ${normalizedData.length} SHIPMENT ROWS ---`)
    console.log(`--- PROCESSED ${normalizedMonthlyData.length} MONTHLY DATA ROWS ---`)
    
    return { shipments: normalizedData, monthlyData: normalizedMonthlyData }

  } catch (err) {
    console.error("Error fetching shipments:", err)
    console.error("Error details:", {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
    return { shipments: [], monthlyData: [] }
  }
}

// --- Action for the Dropdown ---
export async function getClientGroups() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any).role !== 'KPI') {
    return []
  }

  const cmpid = (session.user as any).cmpid
  if (!cmpid) return []

  const query = `
    SELECT GRP_NAME as label, CON_CODE as value 
    FROM TBL_KPI_CONSIGNEE_GRP 
    WHERE FK_CMPID = @p0
  `
  
  try {
    const groups = await executeQuery(query, [cmpid])
    return groups || []
  } catch (e) {
    console.error("Failed to fetch client groups", e)
    return []
  }
}