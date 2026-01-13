'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function getShipments() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return []
  }

  const { name, role, pkid, concode, cmpid, grpcode } = session.user as any

  // --- PROOF OF CONCEPT LOGGING ---
  console.log("==========================================")
  console.log("🚀 AUTHENTICATED USER SESSION:")
  console.log(`👤 User: ${name}`)
  console.log(`🛡️ Role: ${role}`)
  console.log(`🔑 CMPID: ${cmpid}`)
  console.log(`🔗 PKID: ${pkid}`)
  console.log(`📦 CONCODE: ${concode}`)
  console.log(`🏷️ GRPCODE: ${grpcode}`)
  console.log("==========================================")

  // Returning empty for now until main procedure is uncommented
  return []
}

// --- NEW ACTION FOR THE 2ND SELECT STATEMENT ---
export async function getClientGroups() {
  const session = await getServerSession(authOptions)

  // Only KPI users need this list
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