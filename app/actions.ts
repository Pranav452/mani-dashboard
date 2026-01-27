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
    
    if (!authResult || authResult.length === 0) {
      console.error(`User ${username} not found in CMP_DTLS`)
      return null
    }

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

    const payload = {
      rawShipments: resultSets[2] || [],
      kpiTotals: resultSets[3]?.[0] || { TOTAL_SHIPMENT: 0, CONT_GRWT: 0 },
      monthlyStats: resultSets[4] || [],
      avgTransit: resultSets[5]?.[0] || { Avg_Pickup_To_Arrival_Days: 0 },
      extremes: resultSets[6]?.[0] || { Fastest_TT: 0, Slowest_TT: 0 },
      median: resultSets[7]?.[0] || { Median_TT: 0 },
      onTime: resultSets[8]?.[0] || { OnTime_Percentage: 0 },
      monthlyOnTime: resultSets[9] || [],
      transitBreakdown: resultSets[10]?.[0] || {}
    }

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