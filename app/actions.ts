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
      avgTransit: { AvgTT_Pickup_Arrival: 0 },
      monthlyAvgTransit: [],
      originModeTEU: [],
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
    // Index 0: CMPID, PKID, CONCODE, GRPCODE (metadata - ignore)
    // Index 1: TEXTFIELD, VALUEFIELD (consignee groups - ignore)
    // Index 2: RAW SHIPMENT LIST
    // Index 3: TOTAL_SHIPMENT, CONT_GRWT, ORD_CHBLWT
    // Index 4: Month, Total_TEU, Total_CBM, Total_Weight_KG
    // Index 5: AvgTT_Pickup_Arrival (single value)
    // Index 6: Month, AvgTT_Pickup_Arrival (monthly breakdown)
    // Index 7: Fastest_TT, Slowest_TT
    // Index 8: Median_TT
    // Index 9: OnTime_Percentage
    // Index 10: Month, OnTime_Percentage
    // Index 11: Avg_Pickup_Arrival, Avg_Departure_Delivery, Avg_Cargo_ATD, Avg_ATD_ATA, Avg_ATA_Delivery
    // Index 12: ORIGIN, MODE, Total_TEU (for pie chart)

    const payload = {
      rawShipments: resultSets[2] || [],
      kpiTotals: resultSets[3]?.[0] || { TOTAL_SHIPMENT: 0, CONT_GRWT: 0, ORD_CHBLWT: 0 },
      monthlyStats: resultSets[4] || [],
      avgTransit: resultSets[5]?.[0] || { AvgTT_Pickup_Arrival: 0 },
      monthlyAvgTransit: resultSets[6] || [],
      extremes: resultSets[7]?.[0] || { Fastest_TT: 0, Slowest_TT: 0 },
      median: resultSets[8]?.[0] || { Median_TT: 0 },
      onTime: resultSets[9]?.[0] || { OnTime_Percentage: 0 },
      monthlyOnTime: resultSets[10] || [],
      transitBreakdown: resultSets[11]?.[0] || {},
      originModeTEU: resultSets[12] || []
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