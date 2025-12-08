import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { DataSource } from "typeorm"
import { SystemMessage, HumanMessage } from "@langchain/core/messages"

// --- 1. SMART SCHEMA DEFINITION V4 (Type-Safe Edition) ---
const SCHEMA_PROMPT = `
You are a PostgreSQL expert assisting a Logistics Manager.
Your job is to generate a valid SQL query to answer the user's question based on the 'shipments' table.

### TABLE SCHEMA: public.shipments
- JOBNO (text): Unique Job ID
- MODE (text): 'SEA', 'AIR'
- ISDIFFAIR (text): If '1', '2', 'YES', or 'TRUE' -> Mode is 'SEA-AIR'
- CONNAME (text): Provider Name (e.g., 'PROMOD')
- LINER_NAME (text): Carrier Name (e.g., 'MSC'). *Often NULL for Air.*
- POL (text): Origin Port
- POD (text): Dest Port
- ETD (text): Departure Date. FORMAT: 'DD-MM-YYYY' (e.g., '13-01-2024') or 'YYYYMMDD'.
- CONT_GRWT (double precision): Weight in KG.
- CONT_TEU (text): TEU count. **STORED AS TEXT.**
- CONT_UTILIZATION (text): % of container filled. **STORED AS TEXT.**
- SHPTSTATUS (text): Status (e.g., 'DELIVERED', 'BOOKING').

### CRITICAL RULES (Follow these or SQL will crash):
1. **CASTING TEXT TO NUMERIC**:
   - Columns **"CONT_UTILIZATION"** and **"CONT_TEU"** are TEXT.
   - You CANNOT use AVG() or SUM() directly.
   - **Correct Syntax**: \`AVG(NULLIF("CONT_UTILIZATION", '')::numeric)\`
   - **Correct Syntax**: \`SUM(NULLIF("CONT_TEU", '')::numeric)\`
   - *Never* try to sum them without casting.

2. **"Loss" / "Inefficiency" Logic**:
   - If user asks about "Loss" or "Inefficiency", check **Utilization**.
   - Query: \`SELECT "MODE", AVG(NULLIF("CONT_UTILIZATION", '')::numeric) as avg_util FROM shipments GROUP BY "MODE" ORDER BY avg_util ASC\`
   - Explain that low utilization means shipping empty space (inefficiency).

3. **Date Handling**:
   - Use: \`SUBSTRING("ETD" FROM '\\d{4}')\` to match years.
   - Example "Air 2024": \`WHERE "MODE" = 'AIR' AND "ETD" LIKE '%2024%'\`

4. **Carrier Fallback**:
   - Use: \`COALESCE(NULLIF("LINER_NAME", ''), "CONNAME", 'Unknown')\`

5. **SEA-AIR Logic**:
   - SEA-AIR: \`"ISDIFFAIR" IN ('1','2','YES')\`
   - AIR: \`"MODE" = 'AIR' AND ("ISDIFFAIR" IS NULL OR "ISDIFFAIR" NOT IN ('1','2','YES'))\`
   - SEA: \`"MODE" = 'SEA' AND ("ISDIFFAIR" IS NULL OR "ISDIFFAIR" NOT IN ('1','2','YES'))\`

6. **Output**: Return ONLY the raw SQL. No markdown.
`

// --- 2. DATABASE CONNECTION ---
let datasource: DataSource | null = null

const getDataSource = async () => {
  if (datasource?.isInitialized) return datasource
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL")

  // Use connection string as-is
  const url = process.env.DATABASE_URL

  datasource = new DataSource({
    type: "postgres",
    url: url,
    synchronize: false,
    logging: false,
  })

  await datasource.initialize()
  return datasource
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    if (!question) return NextResponse.json({ error: "No question provided" }, { status: 400 })

    const ds = await getDataSource()
    const llm = new ChatOpenAI({ 
      model: "gpt-4o", 
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY
    })

    // --- STEP 1: GENERATE SQL ---
    const sqlResponse = await llm.invoke([
      new SystemMessage(SCHEMA_PROMPT),
      new HumanMessage(`Generate a SQL query for: "${question}"`)
    ])
    
    let sqlQuery = sqlResponse.content.toString().replace(/```sql/g, '').replace(/```/g, '').trim()
    console.log("🤖 SQL:", sqlQuery)

    // --- STEP 2: EXECUTE ---
    let result = []
    try {
      result = await ds.query(sqlQuery)
    } catch (sqlError: any) {
      console.error("❌ SQL Error:", sqlError.message)
      // Retry once with error feedback
      const fixResponse = await llm.invoke([
        new SystemMessage(SCHEMA_PROMPT),
        new HumanMessage(`Fix this SQL error: "${sqlError.message}" in query: ${sqlQuery}`)
      ])
      sqlQuery = fixResponse.content.toString().replace(/```sql/g, '').replace(/```/g, '').trim()
      console.log("🤖 Retrying SQL:", sqlQuery)
      result = await ds.query(sqlQuery)
    }

    // --- STEP 3: SUMMARIZE ---
    if (!result || result.length === 0) {
      return NextResponse.json({ answer: "I couldn't find any records matching that criteria." })
    }

    const finalResponse = await llm.invoke([
      new SystemMessage("You are a Logistics Analyst. Summarize the DB results for the user. If discussing 'Loss', mention it is based on Utilization (Efficiency). Format numbers nicely."),
      new HumanMessage(`User: "${question}"\nDB Result: ${JSON.stringify(result, null, 2)}`)
    ])

    return NextResponse.json({ answer: finalResponse.content })

  } catch (error: any) {
    console.error("🔥 Error:", error)
    return NextResponse.json({ answer: "I'm having trouble connecting to the database right now." })
  }
}