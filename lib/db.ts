import net from 'node:net'
import sql from 'mssql'

// Helper to parse "Server,Port" format from .env
const getServerAndPort = (serverString: string | undefined) => {
  if (!serverString) return { server: 'localhost', port: 1433 }
  const parts = serverString.split(',')
  return {
    server: parts[0],
    port: parts[1] ? parseInt(parts[1]) : 1433
  }
}

const { server, port } = getServerAndPort(process.env.DB_SERVER)

// Node (newer releases) rejects using an IP as TLS SNI. Tedious uses `server` as SNI when it is an IP unless
// `options.serverName` is set. With `trustServerCertificate: true`, a placeholder hostname is enough for the handshake.
const connectByIp = net.isIP(server) !== 0
const tlsServerName = connectByIp
  ? (process.env.DB_TLS_SERVER_NAME?.trim() || 'localhost')
  : undefined

const sqlConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: server,
  port: port,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, 
    trustServerCertificate: true, 
    enableArithAbort: true,
    ...(tlsServerName ? { serverName: tlsServerName } : {}),

    // --- CRITICAL FIX FOR VERCEL ---
    // This forces Node.js to accept older TLS 1.0/1.1 protocols
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1',
      ciphers: 'DEFAULT@SECLEVEL=0' 
    }
  }
}

// Keep this for backward compatibility (Auth uses it)
export async function executeQuery(query: string, params: any[] = []) {
  try {
    let pool = await sql.connect(sqlConfig)
    let request = pool.request()
    
    params.forEach((p, index) => {
        request.input(`p${index}`, p)
    })
    
    const result = await request.query(query)
    return result.recordset // Returns only the first table
  } catch (err) {
    console.error('SQL Error', err)
    return null
  }
}

// NEW: Use this for Stored Procedures that return multiple tables
export async function executeSP(query: string, params: any[] = []) {
  try {
    let pool = await sql.connect(sqlConfig)
    let request = pool.request()
    
    params.forEach((p, index) => {
        request.input(`p${index}`, p)
    })
    
    const result = await request.query(query)
    return result.recordsets // Returns ARRAY of tables (e.g. [Table1, Table2, Table3])
  } catch (err) {
    console.error('SQL SP Error', err)
    return null
  }
}