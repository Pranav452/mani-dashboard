import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"
import { DataSource } from "typeorm"
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"

// --- SMART SCHEMA V5 (With Memory & Math Fixes) ---
const SCHEMA_PROMPT = `
You are a PostgreSQL expert assisting a Logistics Manager.
Your job is to generate a valid SQL query to answer the user's question.

### TABLE SCHEMA: public.shipments
- JOBNO (text): Unique Job ID
- MODE (text): 'SEA', 'AIR'
- ISDIFFAIR (text): '1'/'2'/'YES' means 'SEA-AIR'
- CONNAME (text): Provider
- LINER_NAME (text): Carrier
- POL (text), POD (text): Ports
- ETD (text): Departure Date (DD-MM-YYYY)
- CONT_GRWT (double): Weight KG
- CONT_TEU (text): TEU count. *Stored as TEXT*.
- CONT_UTILIZATION (text): % Utilization (0-100). *Stored as TEXT*.
- SHPTSTATUS (text): Status (e.g., 'DELIVERED', 'BOOKING').

### CRITICAL RULES:
1. **Utilization / Loss Logic**:
   - Utilization is often '0' for empty records. IGNORE THEM.
   - Correct Query: \`SELECT "MODE", AVG(NULLIF("CONT_UTILIZATION", '')::numeric) as avg_util FROM shipments WHERE NULLIF("CONT_UTILIZATION", '')::numeric > 0 GROUP BY "MODE"\`
   - If user asks about "Loss", refer to Low Utilization.

2. **Context Awareness**:
   - If user asks "What about 2024?", apply the PREVIOUS filter + the new year.
   - Look at the chat history provided.

3. **Date Handling**:
   - Year: \`SUBSTRING("ETD" FROM '\\d{4}')\`
   - Example "Air 2024": \`WHERE "MODE" = 'AIR' AND "ETD" LIKE '%2024%'\`

4. **CASTING TEXT TO NUMERIC**:
   - Columns **"CONT_UTILIZATION"** and **"CONT_TEU"** are TEXT.
   - **Correct Syntax**: \`AVG(NULLIF("CONT_UTILIZATION", '')::numeric)\`
   - **Correct Syntax**: \`SUM(NULLIF("CONT_TEU", '')::numeric)\`

5. **Carrier Fallback**:
   - Use: \`COALESCE(NULLIF("LINER_NAME", ''), "CONNAME", 'Unknown')\`

6. **SEA-AIR Logic**:
   - SEA-AIR: \`"ISDIFFAIR" IN ('1','2','YES')\`
   - AIR: \`"MODE" = 'AIR' AND ("ISDIFFAIR" IS NULL OR "ISDIFFAIR" NOT IN ('1','2','YES'))\`
   - SEA: \`"MODE" = 'SEA' AND ("ISDIFFAIR" IS NULL OR "ISDIFFAIR" NOT IN ('1','2','YES'))\`

7. **Output**: Return ONLY the raw SQL. No markdown.
`

let datasource: DataSource | null = null

const getDataSource = async () => {
  if (datasource?.isInitialized) return datasource
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL")

  datasource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: false,
    logging: false,
  })

  await datasource.initialize()
  return datasource
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content

    // Convert frontend messages to LangChain format for context
    const history = messages.slice(0, -1).map((m: any) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    )

    const ds = await getDataSource()
    const llm = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY
    })

    // Generate SQL with History Context
    const sqlResponse = await llm.invoke([
      new SystemMessage(SCHEMA_PROMPT),
      ...history,
      new HumanMessage(`Generate SQL for: "${lastMessage}"`)
    ])

    let sqlQuery = sqlResponse.content.toString().replace(/```sql/g, '').replace(/```/g, '').trim()
    console.log("SQL:", sqlQuery)

    // Execute
    let result = []
    try {
      result = await ds.query(sqlQuery)
    } catch (sqlError: any) {
      console.error("SQL Error:", sqlError.message)
      // Retry once with error feedback
      const fixResponse = await llm.invoke([
        new SystemMessage(SCHEMA_PROMPT),
        new HumanMessage(`Fix this SQL error: "${sqlError.message}" in query: ${sqlQuery}`)
      ])
      sqlQuery = fixResponse.content.toString().replace(/```sql/g, '').replace(/```/g, '').trim()
      console.log("Retrying SQL:", sqlQuery)
      try {
        result = await ds.query(sqlQuery)
      } catch (retryError: any) {
        console.error("Retry failed:", retryError.message)
        return NextResponse.json({
          answer: "I had trouble with that query. Could you try asking differently?",
          sql_query: sqlQuery
        })
      }
    }

    // Summarize
    if (!result || result.length === 0) {
      return NextResponse.json({
        answer: "No records found for that specific criteria.",
        sql_query: sqlQuery
      })
    }

    const finalResponse = await llm.invoke([
      new SystemMessage("You are a Logistics Analyst. Summarize these database results. Be concise. If discussing Loss/Efficiency, mention it is based on Utilization. Format numbers nicely."),
      new HumanMessage(`User Question: "${lastMessage}"\nData: ${JSON.stringify(result, null, 2)}`)
    ])

    return NextResponse.json({
      answer: finalResponse.content,
      sql_query: sqlQuery
    })

  } catch (error: any) {
    console.error("Agent Error:", error)
    return NextResponse.json({
      answer: "I'm having trouble connecting to the database right now.",
      sql_query: null
    })
  }
}
