'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeSP, executeQuery } from "@/lib/db"

// Filter Types
export interface DashboardFilters {
  mode?: string | null          // 'SEA', 'AIR', 'SEA-AIR', NULL = ALL
  client?: string | null         // Specific CONCODE, NULL = ALL
  dateFrom?: string | null       // YYYYMMDD format, NULL = use default
  dateTo?: string | null         // YYYYMMDD format, NULL = use default
  office?: string | null         // Comma-separated POL codes (e.g., 'NH1,BOM,MAA'), NULL = ALL
}

export async function getShipments(filters?: DashboardFilters) {
  const session = await getServerSession(authOptions)

  if (!session?.user) return null

  // 1. GENERAL AUTH FIX: Trim the username from session
  // This fixes 'TAOE                 ' becoming 'TAOE'
  const rawName = (session.user as any).name || ''
  const username = rawName.trim()

  console.log(`--- FETCHING DATA FOR: '${username}' ---`)
  console.log('FILTERS:', filters)

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
      kpiTotals: { TOTAL_SHIPMENT: mockData.length, CONT_GRWT: mockData.reduce((sum: number, r: any) => sum + (r.CONT_GRWT || 0), 0), ORD_CHBLWT: 0 },
      monthlyStats: [],
      avgTransit: { AvgTT_Pickup_Arrival: 0 },
      monthlyAvgTransit: [],
      extremes: { Fastest_TT: 0, Slowest_TT: 0 },
      onTime: { OnTime_Percentage: 0 },
      monthlyOnTime: [],
      transitBreakdown: {},
      originModeTEU: [],
      linerBreakdown: [],
      departToLastDelivery: {},
      monthlyDepartToLastDelivery: [],
      linerOnTimePerformance: [],
      routePerformance: [],
      delayDistribution: [],
      containerSizeImpact: [],
      clientPerformance: [],
      weekOfMonthPattern: [],
      shipmentStatusBreakdown: [],
      metadata: {},
      clientGroups: []
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

    // 3. PREPARE FILTER PARAMETERS
    const filterMode = filters?.mode || null
    const filterClient = filters?.client || null
    const filterDateFrom = filters?.dateFrom || null
    const filterDateTo = filters?.dateTo || null
    const filterOffice = filters?.office || null

    // 4. EXECUTE DASHBOARD SP WITH FILTERS
    const spQuery = `EXEC USP_CLIENT_DASHBOARD_PAGELOAD @p0, @p1, @p2, @p3, @p4, @p5, @p6`
    const resultSets = await executeSP(spQuery, [
      username,
      dbPassword,
      filterMode,
      filterClient,
      filterDateFrom,
      filterDateTo,
      filterOffice
    ])

    if (!resultSets || !Array.isArray(resultSets)) return null

    // 5. MAP RESULT SETS (Updated to SP: 30-01-2026 - FILTERED VERSION)
    // Index 0: CMPID, PKID, CONCODE, GRPCODE (metadata)
    // Index 1: TEXTFIELD, VALUEFIELD (consignee groups)
    // Index 2: RAW SHIPMENT LIST (from #TMP_SPResults - FILTERED)
    // Index 3: TOTAL_SHIPMENT, CONT_GRWT, ORD_CHBLWT
    // Index 4: Month, Total_TEU, Total_CBM, Total_Weight_KG
    // Index 5: Avg Transit Breakdown (6 columns)
    // Index 6: Fastest_TT, Slowest_TT
    // Index 7: OnTime_Percentage
    // Index 8: Month, OnTime_Percentage
    // Index 9: Month-wise AvgTT_Pickup_Arrival
    // Index 10: ORIGIN, MODE, Total_TEU
    // Index 11: LINER_NAME, AvgTransitTime_Liner
    // Index 12: AvgTT_Departure_LastDelivery
    // Index 13: Month-wise AvgTT_Departure_LastDelivery
    // Index 14: Liner-wise On-Time Performance
    // Index 15: Route Performance (POL → POD)
    // Index 16: Delay Distribution (Bucketed)
    // Index 17: Container Size Impact
    // Index 18: Client-wise Performance
    // Index 19: Week-of-Month Pattern
    // Index 20: Shipment Status Breakdown

    const transitBreakdown = resultSets[5]?.[0] || {}
    const payload = {
      // Core Data
      rawShipments: resultSets[2] || [],
      kpiTotals: resultSets[3]?.[0] || { TOTAL_SHIPMENT: 0, CONT_GRWT: 0, ORD_CHBLWT: 0 },
      monthlyStats: resultSets[4] || [],

      // Transit Metrics
      avgTransit: { AvgTT_Pickup_Arrival: transitBreakdown.Avg_Pickup_Arrival || 0 },
      monthlyAvgTransit: resultSets[9] || [],
      extremes: resultSets[6]?.[0] || { Fastest_TT: 0, Slowest_TT: 0 },
      transitBreakdown,

      // On-Time Metrics
      onTime: resultSets[7]?.[0] || { OnTime_Percentage: 0 },
      monthlyOnTime: resultSets[8] || [],

      // Breakdown Charts
      originModeTEU: resultSets[10] || [],
      linerBreakdown: resultSets[11] || [],
      
      // Delivery Metrics
      departToLastDelivery: resultSets[12]?.[0] || {},
      monthlyDepartToLastDelivery: resultSets[13] || [],

      // NEW: Advanced Analytics (from new SP)
      linerOnTimePerformance: resultSets[14] || [],
      routePerformance: resultSets[15] || [],
      delayDistribution: resultSets[16] || [],
      containerSizeImpact: resultSets[17] || [],
      clientPerformance: resultSets[18] || [],
      weekOfMonthPattern: resultSets[19] || [],
      shipmentStatusBreakdown: resultSets[20] || [],

      // Metadata
      metadata: resultSets[0]?.[0] || {},
      clientGroups: resultSets[1] || [],
    }

    console.log(`--- DATA LOADED: ${payload.rawShipments.length} Rows, Total Weight: ${payload.kpiTotals.CONT_GRWT} ---`)
    console.log(`--- FILTERS APPLIED: Mode=${filterMode}, Client=${filterClient}, Dates=${filterDateFrom}-${filterDateTo}, Office=${filterOffice} ---`)
    
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