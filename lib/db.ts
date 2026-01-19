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
    // 1. Keep encryption on (matches your server settings)
    encrypt: true, 
    
    // 2. Trust the self-signed certificate
    trustServerCertificate: true, 
    
    // 3. Helps with some IP-based connection issues
    enableArithAbort: true,

    // 4. THE FIX FOR VERCEL: Allow legacy TLS versions (TLSv1.0 / TLSv1.1)
    // This tells Node.js OpenSSL 3 to accept older protocols used by legacy SQL Servers
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1'
    }
  }
}

export async function executeQuery(query: string, params: any[] = []) {
  try {
    let pool = await sql.connect(sqlConfig)
    let request = pool.request()
    
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