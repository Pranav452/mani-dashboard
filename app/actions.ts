'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function getShipments() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    console.warn("Unauthorized access attempt to getShipments")
    return []
  }

  const { role, name } = session.user as any

  console.log(`--- FETCHING DATA FOR: ${name} (${role}) ---`)

  // --- DEMO MODE: Return mock data instead of querying database ---
  if (role === "DEMO") {
    console.log("🎭 DEMO MODE ACTIVE: Loading comprehensive mock data...")
    const { generateMockShipments } = await import("@/lib/mock-data")
    const mockData = generateMockShipments(1000) // Generate 1000 impressive shipments
    console.log(`✓ Returned ${mockData.length} mock shipments for demo`)
    return mockData
  }

  try {
    // Use centralized stored procedure for all data fetching
    // This ensures consistency and simplifies maintenance
    const username = name || 'HAPPYCHIC'
    
    console.log(`--- CALLING USP_CLIENT_DASHBOARD_PAGELOAD with username: ${username} ---`)
    
    const query = `EXEC USP_CLIENT_DASHBOARD_PAGELOAD @p0, @p1`
    const params = [username, username]
    
    const data = await executeQuery(query, params)

    if (!data) {
      console.log("--- QUERY RETURNED NULL/UNDEFINED ---")
      return []
    }

    // Normalize Keys to uppercase for consistency
    const normalizedData = data.map((row: any) => {
      const newRow: any = {}
      Object.keys(row).forEach(key => {
        newRow[key.toUpperCase()] = row[key]
      })
      return newRow
    })

    console.log(`--- RETURNED ${normalizedData.length} ROWS ---`)
    return normalizedData

  } catch (err) {
    console.error("Error fetching shipments:", err)
    return []
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