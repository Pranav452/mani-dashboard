import sql from 'mssql'

// Ensure all required config properties are strings (not undefined)
const sqlConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  server: process.env.DB_SERVER || '',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure, set to false for local if needed
    trustServerCertificate: true // change to false for production
  }
} as sql.config

export async function executeQuery(query: string, params: any[] = []) {
  try {
    const pool = await sql.connect(sqlConfig)
    const request = pool.request()
    
    // Simple parameter injection handling
    params.forEach((p, index) => {
        request.input(`p${index}`, p)
    })
    
    const result = await request.query(query)
    return result.recordset
  } catch (err) {
    console.error('SQL Error', err)
    return null
  }
}
