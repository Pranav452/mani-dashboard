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
const isDev = process.env.NODE_ENV === 'development'

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
    // 1. Encryption Strategy
    // Dev: If using IP, sometimes 'encrypt: false' is needed to bypass "ServerName IP" error
    // Prod: Always encrypt
    encrypt: isDev ? false : true, 
    
    // 2. Trust Server Certificate (Always true for self-signed/legacy certs)
    trustServerCertificate: true, 
    
    // 3. Helps with some IP-based connection issues
    enableArithAbort: true,

    // 4. Legacy TLS Support (Critical for Vercel + Old SQL Server)
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