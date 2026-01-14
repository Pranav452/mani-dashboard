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

  const { role, grpcode, name } = session.user as any

  console.log(`--- FETCHING DATA FOR: ${name} (${role}) ---`)

  try {
    // 1. Define the Columns (Matches your Boss's SQL exactly)
    const selectColumns = `
      SELECT 
        JOBNO, MODE, ISDIFFAIR, MCONCODE, CONCODE, CONNAME, VSL_NAME, CONT_VESSEL, DIRECTVSL,
        LINER_CODE, LINER_NAME, SHIPPER, POL, POD, CONTMAWB, CONT_CONTSIZE, CONT_CONTSTATUS,
        CONT_MOVETYPE, CONT_TEU, CONT_CBMCAP, CONT_UTILIZED,
        CONT_UTILIZEDPER, CONT_UTILIZATION, CONT_NOOFPKGS, CONT_NOOFPCS,
        CONT_CBM=CONVERT(FLOAT,CONT_CBM), CONT_GRWT=CONVERT(FLOAT,CONT_GRWT), CONT_NETWT=CONVERT(FLOAT,CONT_NETWT),
        ORDERNO, ORD_PKGS, ORD_PIECES, ORD_TYPEOFPCS,
        ORD_CBM=CONVERT(FLOAT,ORD_CBM), ORD_GRWT=CONVERT(FLOAT,ORD_GRWT), ORD_CHBLWT=CONVERT(FLOAT,ORD_CHBLWT),
        DOCRECD, CARGORECPT, APPROVAL, ETD, ATD, ETA, ATA, DELIVERY,
        CITYCODE, ORIGIN, SHPTSTATUS, DOCDT 
      FROM TBL_CLIENT_KPI_DASHBOARD_PBI
    `

    let query = ""
    let params: any[] = []

    // 2. Build Query based on Role
    if (role === 'SA') {
      // Super Admin: See everything (Top 2000 to prevent crash)
      query = `${selectColumns} ORDER BY JOBNO DESC OFFSET 0 ROWS FETCH NEXT 2000 ROWS ONLY`
    } else {
      // KPI Client: Apply the "Boss Logic"
      // @p0 = grpcode (MAINCONCODE)
      // @p1 = MODE (Default 'SEA')
      // @p2 = ISDIFFAIR (Default '0')
      
      query = `
        ${selectColumns}
        WHERE 
          CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
          AND MODE = @p1
          AND ISDIFFAIR = @p2
          AND DOCDT >= DBO.CONVERTDATE_YYYYMMDD(convert(varchar, dateadd(mm, -24, GETDATE()), 105))
        ORDER BY JOBNO DESC
      `
      
      // We pass the session's grpcode into the split function
      // Hardcoded defaults for Phase 1: SEA and '0'
      params = [grpcode || '', 'SEA', '0']
    }

    // 3. Execute
    const data = await executeQuery(query, params)

    if (!data) return []

    // 4. Normalize Keys to Uppercase (Safe-guard for frontend)
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