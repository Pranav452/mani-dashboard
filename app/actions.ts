'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeSP, executeQuery } from "@/lib/db"

export async function getShipments() {
  const session = await getServerSession(authOptions)

  if (!session?.user) return null

  // 1. GENERAL AUTH FIX: Trim the username from session
  // This fixes 'TAOE                 ' becoming 'TAOE'
  const rawName = (session.user as any).name || ''
  const username = rawName.trim()

  console.log(`--- FETCHING DATA FOR: '${username}' ---`)

  // --- DEMO MODE: Return mock data instead of querying database ---
  const { role } = session.user as any
  if (role === "DEMO") {
    console.log("DEMO MODE ACTIVE: Loading comprehensive mock data...")
    const { generateMockShipments } = await import("@/lib/mock-data")
    const mockData = generateMockShipments(1000)
    console.log(`Returned ${mockData.length} mock shipments for demo`)
    // Return in new format for demo mode
    return {
      rawShipments: mockData,
      kpiTotals: { TOTAL_SHIPMENT: mockData.length, CONT_GRWT: mockData.reduce((sum: number, r: any) => sum + (r.CONT_GRWT || 0), 0) },
      monthlyStats: [],
      avgTransit: { Avg_Pickup_To_Arrival_Days: 0 },
      extremes: { Fastest_TT: 0, Slowest_TT: 0 },
      median: { Median_TT: 0 },
      onTime: { OnTime_Percentage: 0 },
      monthlyOnTime: [],
      transitBreakdown: {}
    }
  }

  try {
    // 2. DYNAMIC PASSWORD LOOKUP (Removes hardcoding)
    // We fetch the correct DB password for this user so we can call the SP successfully
    const authQuery = `SELECT CMP_PASSWORD FROM CMP_DTLS WHERE LTRIM(RTRIM(CMP_USERNAME)) = @p0`
    const authResult = await executeQuery(authQuery, [username])
    
    console.log(`--- CALLING USP_CLIENT_DASHBOARD_PAGELOAD with username: ${username} ---`)
    
    // Execute Stored Procedure
    const query = `EXEC USP_CLIENT_DASHBOARD_PAGELOAD @p0, @p1`
    const params = [username, username]
    
    // Use executeSP to get ALL result sets
    const resultSets = await executeSP(query, params)

    if (!resultSets || !Array.isArray(resultSets) || resultSets.length === 0) {
      console.log("--- QUERY RETURNED NULL ---")
      return []
    }

    // LOGIC: The SP returns 3 tables.
    // Table 0: Mapping Info (CMPID, PKID, CONCODE, GRPCODE)
    // Table 1: Dropdown Data (TEXTFIELD, VALUEFIELD)
    // Table 2: SHIPMENT DATA (This is what we want - JOBNO, MODE, ETD, etc.)
    
    console.log(`--- RAW RESULT SETS: ${resultSets.length} ---`)
    
    // Log each result set for debugging
    resultSets.forEach((rs: any, index: number) => {
      console.log(`--- RESULT SET ${index}: ${rs.length} rows ---`)
      if (rs.length > 0) {
        console.log(`--- RESULT SET ${index} KEYS:`, Object.keys(rs[0]))
      }
    })

    // Check if we have the 3rd table
    const shipmentData = resultSets.length >= 3 ? resultSets[2] : []

    const dbPassword = authResult[0].CMP_PASSWORD
    console.log(`--- CREDENTIALS VERIFIED. CALLING SP... ---`)

    // 3. EXECUTE DASHBOARD SP
    const spQuery = `EXEC USP_CLIENT_DASHBOARD_PAGELOAD @p0, @p1`
    const resultSets = await executeSP(spQuery, [username, dbPassword])

    if (!resultSets || !Array.isArray(resultSets)) return null

    // 4. MAP RESULT SETS (Based on your provided SP structure)
    // Index 0: Mapping (Ignore)
    // Index 1: Dropdown (Ignore)
    // Index 2: RAW SHIPMENT LIST
    // Index 3: TOTALS (Shipment count, weight)
    // Index 4: MONTHLY STATS (TEU, Weight trends)
    // Index 5: AVG TRANSIT
    // Index 6: FASTEST/SLOWEST
    // Index 7: MEDIAN
    // Index 8: ON TIME %
    // Index 9: MONTHLY ON TIME
    // Index 10: TRANSIT BREAKDOWN

    // Normalize Keys to Uppercase with safeguards
    const normalizedData = shipmentData.map((row: any) => {
      const newRow: any = {}
      Object.keys(row).forEach(key => {
        // Remove any potential whitespace from keys and uppercase them
        const cleanKey = key.trim().toUpperCase()
        newRow[cleanKey] = row[key]
      })
      return newRow
    })

    console.log(`--- DATA LOADED: ${payload.rawShipments.length} Rows, Total Weight: ${payload.kpiTotals.CONT_GRWT} ---`)
    
    return payload

  } catch (err) {
    console.error("Error in getShipments:", err)
    return null
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