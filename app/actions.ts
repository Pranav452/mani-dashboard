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
        JOBNO, 
        MODE=(CASE 
          WHEN UPPER(MODE)='SEA' AND ISDIFFAIR='2' THEN 'SEA-AIR'
          WHEN UPPER(MODE)='SEA' AND ISDIFFAIR='0' THEN 'SEA'
          WHEN UPPER(MODE)='AIR' AND ISDIFFAIR='0' THEN 'AIR'
          ELSE MODE
        END), 
        ISDIFFAIR, MCONCODE, CONCODE, CONNAME, VSL_NAME, CONT_VESSEL, DIRECTVSL,
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
      // Removed MODE and ISDIFFAIR filters to get all modes (SEA, AIR, SEA-AIR)
      // ISDIFFAIR logic is still used in getComputedMode() to determine mode type
      
      // Use grpcode exactly as stored (matching your SQL query)
      query = `
        ${selectColumns}
        WHERE 
          CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
          AND DOCDT >= DBO.CONVERTDATE_YYYYMMDD(convert(varchar, dateadd(mm, -24, GETDATE()), 105))
        ORDER BY JOBNO DESC
      `
      
      // We pass the session's grpcode into the split function
      // No MODE or ISDIFFAIR filters - getting all modes
      params = [grpcode || '']
      
      console.log(`--- QUERY PARAMS: GRPCODE="${grpcode}" (All modes: SEA, AIR, SEA-AIR) ---`)
    }

    // 3. Execute
    const data = await executeQuery(query, params)

    if (!data) {
      console.log(`--- QUERY RETURNED NULL/UNDEFINED ---`)
      return []
    }

    console.log(`--- RAW QUERY RESULT: ${data.length} ROWS ---`)

    // 4. Normalize Keys to Uppercase (Safe-guard for frontend)
    const normalizedData = data.map((row: any) => {
      const newRow: any = {}
      Object.keys(row).forEach(key => {
        newRow[key.toUpperCase()] = row[key]
      })
      return newRow
    })

    console.log(`--- RETURNED ${normalizedData.length} ROWS (after normalization) ---`)
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