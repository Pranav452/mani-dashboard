'use server'

import { getServerSession } from "next-auth"
import { executeQuery } from "@/lib/db"

// Example of how to filter data based on the login session
export async function getShipments() {
  const session = await getServerSession()
  
  // If no session, return empty (should be protected by middleware)
  if (!session?.user) {
    console.warn("No session found. User should be authenticated.")
    return []
  }

  // 1. If Super Admin (SA), fetch everything
  if (session.user.role === 'SA') {
    const result = await executeQuery("SELECT * FROM shipments")
    return result || []
  }

  // 2. If KPI User (Client), filter by their Authority or Name
  // Your data shows "HAPPYCHIC" has RoleType 'KPI'.
  // We can filter the shipments where CONNAME matches their username/authority
  const query = "SELECT * FROM shipments WHERE CONNAME = @p0"
  const result = await executeQuery(query, [session.user.name || session.user.email])
  
  return result || []
}