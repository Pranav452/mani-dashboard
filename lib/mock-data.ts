// Mock Data Generator for Demo Mode
// Generates comprehensive worldwide shipment data for presentations

import { format, subDays, addDays } from 'date-fns'

// Worldwide Port Definitions
const PORTS = {
  // Asia-Pacific
  ASIA: [
    { code: 'CNSHA', name: 'Shanghai', country: 'China' },
    { code: 'CNNGB', name: 'Ningbo', country: 'China' },
    { code: 'CNSHK', name: 'Shekou', country: 'China' },
    { code: 'CNSZX', name: 'Shenzhen', country: 'China' },
    { code: 'CNQIN', name: 'Qingdao', country: 'China' },
    { code: 'CNTAO', name: 'Qingdao', country: 'China' },
    { code: 'CNXMN', name: 'Xiamen', country: 'China' },
    { code: 'HKHKG', name: 'Hong Kong', country: 'Hong Kong' },
    { code: 'SGSIN', name: 'Singapore', country: 'Singapore' },
    { code: 'JPTYO', name: 'Tokyo', country: 'Japan' },
    { code: 'JPYOK', name: 'Yokohama', country: 'Japan' },
    { code: 'JPOSA', name: 'Osaka', country: 'Japan' },
    { code: 'KRICN', name: 'Incheon', country: 'South Korea' },
    { code: 'KRPUS', name: 'Busan', country: 'South Korea' },
    { code: 'THBKK', name: 'Bangkok', country: 'Thailand' },
    { code: 'THLCH', name: 'Laem Chabang', country: 'Thailand' },
    { code: 'VNSGN', name: 'Ho Chi Minh', country: 'Vietnam' },
    { code: 'VNHAN', name: 'Hanoi', country: 'Vietnam' },
    { code: 'MYPKG', name: 'Port Klang', country: 'Malaysia' },
    { code: 'IDJKT', name: 'Jakarta', country: 'Indonesia' },
    { code: 'PHMNL', name: 'Manila', country: 'Philippines' },
    { code: 'TWKHH', name: 'Kaohsiung', country: 'Taiwan' },
    { code: 'AUSYD', name: 'Sydney', country: 'Australia' },
    { code: 'AUMEL', name: 'Melbourne', country: 'Australia' },
    { code: 'NZAKL', name: 'Auckland', country: 'New Zealand' },
  ],
  // Europe
  EUROPE: [
    { code: 'NLRTM', name: 'Rotterdam', country: 'Netherlands' },
    { code: 'DEHAM', name: 'Hamburg', country: 'Germany' },
    { code: 'BEANR', name: 'Antwerp', country: 'Belgium' },
    { code: 'GBLGP', name: 'London Gateway', country: 'UK' },
    { code: 'GBFXT', name: 'Felixstowe', country: 'UK' },
    { code: 'GBSOU', name: 'Southampton', country: 'UK' },
    { code: 'FRLEH', name: 'Le Havre', country: 'France' },
    { code: 'FRMRS', name: 'Marseille', country: 'France' },
    { code: 'ESMAD', name: 'Madrid', country: 'Spain' },
    { code: 'ESVLC', name: 'Valencia', country: 'Spain' },
    { code: 'ESBCN', name: 'Barcelona', country: 'Spain' },
    { code: 'ITGOA', name: 'Genoa', country: 'Italy' },
    { code: 'ITNAP', name: 'Naples', country: 'Italy' },
    { code: 'GRGPA', name: 'Piraeus', country: 'Greece' },
    { code: 'PLGDN', name: 'Gdansk', country: 'Poland' },
    { code: 'RUMIA', name: 'Constanta', country: 'Romania' },
  ],
  // Middle East
  MIDDLE_EAST: [
    { code: 'AEDXB', name: 'Dubai', country: 'UAE' },
    { code: 'AEAUH', name: 'Abu Dhabi', country: 'UAE' },
    { code: 'SAJED', name: 'Jeddah', country: 'Saudi Arabia' },
    { code: 'SADAM', name: 'Dammam', country: 'Saudi Arabia' },
    { code: 'OMKHL', name: 'Salalah', country: 'Oman' },
    { code: 'BHBAH', name: 'Bahrain', country: 'Bahrain' },
    { code: 'KWKWI', name: 'Kuwait', country: 'Kuwait' },
  ],
  // Americas
  AMERICAS: [
    { code: 'USLAX', name: 'Los Angeles', country: 'USA' },
    { code: 'USLGB', name: 'Long Beach', country: 'USA' },
    { code: 'USNYC', name: 'New York', country: 'USA' },
    { code: 'USORF', name: 'Norfolk', country: 'USA' },
    { code: 'USSAV', name: 'Savannah', country: 'USA' },
    { code: 'USMIA', name: 'Miami', country: 'USA' },
    { code: 'USHOU', name: 'Houston', country: 'USA' },
    { code: 'USSEA', name: 'Seattle', country: 'USA' },
    { code: 'CAVAN', name: 'Vancouver', country: 'Canada' },
    { code: 'CATOR', name: 'Toronto', country: 'Canada' },
    { code: 'CAMTR', name: 'Montreal', country: 'Canada' },
    { code: 'MXZLO', name: 'Manzanillo', country: 'Mexico' },
    { code: 'BRSSS', name: 'Santos', country: 'Brazil' },
    { code: 'BRRIG', name: 'Rio Grande', country: 'Brazil' },
    { code: 'CLSAI', name: 'San Antonio', country: 'Chile' },
    { code: 'ARBUE', name: 'Buenos Aires', country: 'Argentina' },
  ],
  // Africa
  AFRICA: [
    { code: 'NGLOS', name: 'Lagos', country: 'Nigeria' },
    { code: 'ZADUR', name: 'Durban', country: 'South Africa' },
    { code: 'ZACPT', name: 'Cape Town', country: 'South Africa' },
    { code: 'KEMBA', name: 'Mombasa', country: 'Kenya' },
    { code: 'EGALY', name: 'Alexandria', country: 'Egypt' },
    { code: 'MAPTM', name: 'Tanger Med', country: 'Morocco' },
  ],
  // India (Special focus for the client)
  INDIA: [
    { code: 'NH1', name: 'Delhi ICD', country: 'India' },
    { code: 'INBOM', name: 'Mumbai', country: 'India' },
    { code: 'INJNP', name: 'JNPT Mumbai', country: 'India' },
    { code: 'INMAA', name: 'Chennai', country: 'India' },
    { code: 'INCCU', name: 'Kolkata', country: 'India' },
    { code: 'INBLR', name: 'Bangalore', country: 'India' },
    { code: 'INAMD', name: 'Ahmedabad', country: 'India' },
    { code: 'INCOK', name: 'Cochin', country: 'India' },
  ]
}

// Major Shipping Lines
const SHIPPING_LINES = [
  'Maersk Line',
  'MSC (Mediterranean Shipping Company)',
  'CMA CGM',
  'COSCO Shipping',
  'Hapag-Lloyd',
  'ONE (Ocean Network Express)',
  'Evergreen Marine',
  'Yang Ming Marine Transport',
  'HMM (Hyundai Merchant Marine)',
  'ZIM Integrated Shipping',
  'PIL (Pacific International Lines)',
  'OOCL (Orient Overseas Container Line)',
  'APL (American President Lines)',
  'Wan Hai Lines',
  'SITC Container Lines',
  'TS Lines',
  'Matson Navigation',
  'K Line (Kawasaki Kisen Kaisha)',
  'MOL (Mitsui O.S.K. Lines)',
  'NYK Line (Nippon Yusen Kabushiki Kaisha)',
]

// Airlines for AIR shipments
const AIRLINES = [
  'Emirates SkyCargo',
  'Cathay Pacific Cargo',
  'Qatar Airways Cargo',
  'Korean Air Cargo',
  'Lufthansa Cargo',
  'Singapore Airlines Cargo',
  'Air France-KLM Cargo',
  'Cargolux',
  'Turkish Cargo',
  'FedEx Express',
  'UPS Airlines',
  'DHL Aviation',
  'China Airlines Cargo',
  'ANA Cargo',
  'Etihad Cargo',
]

// Trucking Companies for ROAD shipments
const TRUCKING_COMPANIES = [
  'DHL Supply Chain',
  'DB Schenker',
  'Kuehne + Nagel',
  'XPO Logistics',
  'DSV Road',
  'Panalpina Trucking',
  'Geodis Road Network',
  'CEVA Logistics',
  'Nippon Express',
  'Agility Logistics',
]

// Shipper Companies (Realistic business names)
const SHIPPERS = [
  'Global Electronics Ltd',
  'Pacific Textiles Corp',
  'Euro Fashion Group',
  'Asia Machinery Exports',
  'American Auto Parts Inc',
  'Nordic Furniture AB',
  'Mediterranean Foods SA',
  'Tech Components International',
  'Pharma Solutions GmbH',
  'Green Energy Systems',
  'Sports Equipment World',
  'Premium Cosmetics Ltd',
  'Industrial Tools Corp',
  'Smart Home Devices',
  'Organic Foods Trading',
  'Luxury Goods International',
  'Building Materials Group',
  'Chemical Industries Ltd',
  'Paper & Packaging Co',
  'Retail Fashion Chain',
  'Consumer Electronics Hub',
  'Agricultural Exports Ltd',
  'Metal Products Manufacturing',
  'Plastic Components Inc',
  'Glass & Ceramics Trading',
  'Automotive Parts Global',
  'Apparel Manufacturers',
  'Footwear International',
  'Toy Manufacturing Corp',
  'Books & Media Distribution',
]

// Client/Consignee names for CONNAME field
const CONSIGNEES = [
  'ABC Trading Company',
  'Global Import Solutions',
  'Prime Logistics Partners',
  'Elite Distribution Network',
  'Summit Trading Corporation',
  'Vertex International Trade',
  'Nexus Supply Chain Ltd',
  'Pinnacle Imports Group',
  'Horizon Trading Associates',
  'Zenith Commerce Inc',
  'Atlas Global Traders',
  'Omega Import Export',
  'Delta Trading Solutions',
  'Meridian Logistics Group',
  'Apex International Trading',
]

// Transport modes with weights for realistic distribution
const MODES = [
  { mode: 'SEA', weight: 60, isDiffAir: '0' },
  { mode: 'AIR', weight: 25, isDiffAir: '0' },
  { mode: 'SEA', weight: 10, isDiffAir: '2' }, // SEA-AIR
  { mode: 'ROAD', weight: 5, isDiffAir: '0' },
]

// Container sizes and statuses
const CONTAINER_SIZES = ['20F', '40F', '20H', '40H', '20G', '40G']
const CONTAINER_STATUSES = ['FCL/FCL', 'LCL/LCL', 'LCL/FCL']

// Shipment statuses
const SHIPMENT_STATUSES = [
  'Delivered',
  'In Transit',
  'At Port',
  'Customs Clearance',
  'Departed',
  'Arrived',
  'Completed',
]

// Helper: Random selection from array
const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Helper: Random number in range
const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min

// Helper: Random float in range
const randomFloat = (min: number, max: number, decimals: number = 2): number => 
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals))

// Helper: Weighted random selection for modes
const randomMode = (): { mode: string; isDiffAir: string } => {
  const totalWeight = MODES.reduce((sum, m) => sum + m.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const modeConfig of MODES) {
    random -= modeConfig.weight
    if (random <= 0) {
      return { mode: modeConfig.mode, isDiffAir: modeConfig.isDiffAir }
    }
  }
  
  return MODES[0] // Fallback
}

// Helper: Get all ports from all regions
const getAllPorts = () => {
  return [
    ...PORTS.ASIA,
    ...PORTS.EUROPE,
    ...PORTS.MIDDLE_EAST,
    ...PORTS.AMERICAS,
    ...PORTS.AFRICA,
    ...PORTS.INDIA,
  ]
}

// Helper: Generate realistic date in past 24 months
const generateDate = (baseDate: Date, offsetDays: number = 0): string => {
  const date = addDays(baseDate, offsetDays)
  return format(date, 'dd/MM/yyyy')
}

// Helper: Generate YYYYMMDD format for DOCDT
const generateDocDate = (baseDate: Date): string => {
  return format(baseDate, 'yyyyMMdd')
}

// Generate single shipment
const generateShipment = (index: number): any => {
  const allPorts = getAllPorts()
  
  // Select mode first as it affects other fields
  const { mode, isDiffAir } = randomMode()
  
  // Select origin and destination (ensure they're different)
  let pol = randomFrom(allPorts)
  let pod = randomFrom(allPorts)
  while (pod.code === pol.code) {
    pod = randomFrom(allPorts)
  }
  
  // Generate base date (spread across last 24 months)
  const daysAgo = randomInt(0, 730) // 24 months = ~730 days
  const baseDate = subDays(new Date(), daysAgo)
  
  // Calculate transit times based on mode
  let transitDays = 0
  if (mode === 'SEA') {
    if (isDiffAir === '2') {
      transitDays = randomInt(10, 20) // SEA-AIR
    } else {
      transitDays = randomInt(15, 45) // Regular SEA
    }
  } else if (mode === 'AIR') {
    transitDays = randomInt(1, 5)
  } else if (mode === 'ROAD') {
    transitDays = randomInt(3, 15)
  }
  
  // Generate dates with realistic sequence
  const cargoRecptDate = baseDate
  const docRecdDate = addDays(cargoRecptDate, randomInt(1, 3))
  const etdDate = addDays(docRecdDate, randomInt(2, 5))
  const atdDate = addDays(etdDate, randomInt(-1, 2)) // Can depart early/late
  const etaDate = addDays(atdDate, transitDays)
  
  // 75-85% on-time performance
  const isOnTime = Math.random() < 0.80
  const ataDate = isOnTime 
    ? addDays(etaDate, randomInt(-2, 0))
    : addDays(etaDate, randomInt(1, 5))
  
  const deliveryDate = addDays(ataDate, randomInt(1, 7))
  
  // Select appropriate carrier based on mode
  let carrier = ''
  if (mode === 'AIR' || (mode === 'SEA' && isDiffAir === '2')) {
    carrier = randomFrom(AIRLINES)
  } else if (mode === 'ROAD') {
    carrier = randomFrom(TRUCKING_COMPANIES)
  } else {
    carrier = randomFrom(SHIPPING_LINES)
  }
  
  // Container details (only for SEA shipments)
  const containerSize = mode === 'SEA' ? randomFrom(CONTAINER_SIZES) : ''
  const containerStatus = mode === 'SEA' ? randomFrom(CONTAINER_STATUSES) : ''
  const containerNo = mode === 'SEA' ? `${randomFrom(['MSCU', 'MAEU', 'CMAU', 'COSCO', 'HLCU', 'ONEU'])}${randomInt(1000000, 9999999)}` : ''
  
  // Weight and volume
  const grWt = randomFloat(5, 30, 2) // Gross weight in tons
  const netWt = randomFloat(grWt * 0.85, grWt * 0.95, 2) // Net weight slightly less
  const cbm = randomFloat(10, 70, 2) // CBM
  
  // Packages
  const noOfPkgs = randomInt(50, 500)
  const noOfPcs = randomInt(noOfPkgs, noOfPkgs * 10)
  
  // Financial data
  const revenue = randomFloat(5000, 500000, 2)
  const profitMargin = randomFloat(0.10, 0.30, 2)
  const profit = revenue * profitMargin
  const cost = revenue - profit
  
  // TEU calculation (matches dashboard-logic.ts)
  let teu = 0
  if (mode === 'SEA') {
    if (containerSize === '20F' || containerSize === '20H') {
      teu = containerStatus === 'LCL/LCL' ? 0 : 1
    } else if (containerSize === '40F' || containerSize === '40H') {
      teu = containerStatus === 'LCL/LCL' ? 0 : 2
    } else if (containerSize === '20G') {
      teu = 2
    } else if (containerSize === '40G') {
      teu = 2
    }
  }
  
  // Utilization
  const utilized = randomFloat(cbm * 0.6, cbm * 0.95, 2)
  const utilizedPer = (utilized / cbm) * 100
  
  // Job number
  const jobNo = `DEMO${String(10000 + index).padStart(6, '0')}`
  const bookNo = `BK${randomInt(100000, 999999)}`
  const blNo = `BL${randomInt(100000, 999999)}`
  
  return {
    JOBNO: jobNo,
    MODE: mode,
    ISDIFFAIR: isDiffAir,
    MCONCODE: randomFrom(CONSIGNEES).substring(0, 10).toUpperCase(),
    CONCODE: randomFrom(CONSIGNEES).substring(0, 10).toUpperCase(),
    CONNAME: randomFrom(CONSIGNEES),
    VSL_NAME: mode === 'SEA' ? `VESSEL ${randomInt(100, 999)}` : '',
    CONT_VESSEL: containerNo ? `V${randomInt(100, 999)}` : '',
    DIRECTVSL: mode === 'SEA' ? (Math.random() > 0.5 ? 'DIRECT' : 'TRANSHIP') : '',
    LINER_CODE: carrier.substring(0, 10).toUpperCase(),
    LINER_NAME: carrier,
    SHIPPER: randomFrom(SHIPPERS),
    POL: pol.code,
    POD: pod.code,
    CONTMAWB: mode === 'AIR' ? `${randomInt(100, 999)}-${randomInt(10000000, 99999999)}` : containerNo,
    CONNO: containerNo,
    CONT_CONTSIZE: containerSize,
    CONT_CONTSTATUS: containerStatus,
    CONT_MOVETYPE: mode === 'SEA' ? (Math.random() > 0.5 ? 'CY/CY' : 'CFS/CFS') : '',
    CONT_TEU: teu,
    CONT_CBMCAP: mode === 'SEA' ? (containerSize?.includes('20') ? 33 : 67) : 0,
    CONT_UTILIZED: utilized,
    CONT_UTILIZEDPER: utilizedPer,
    CONT_UTILIZATION: `${utilizedPer.toFixed(1)}%`,
    CONT_NOOFPKGS: noOfPkgs,
    CONT_NOOFPCS: noOfPcs,
    CONT_CBM: cbm,
    CONT_GRWT: grWt,
    CONT_NETWT: netWt,
    ORDERNO: `ORD${randomInt(10000, 99999)}`,
    ORD_PKGS: noOfPkgs,
    ORD_PIECES: noOfPcs,
    ORD_TYPEOFPCS: randomFrom(['CARTONS', 'PALLETS', 'BOXES', 'CRATES', 'BAGS']),
    ORD_CBM: cbm,
    ORD_GRWT: grWt,
    ORD_CHBLWT: grWt * 1.1, // Chargeable weight slightly higher
    DOCRECD: generateDate(docRecdDate),
    CARGORECPT: generateDate(cargoRecptDate),
    APPROVAL: generateDate(addDays(docRecdDate, 1)),
    ETD: generateDate(etdDate),
    ATD: generateDate(atdDate),
    ETA: generateDate(etaDate),
    ATA: Math.random() > 0.1 ? generateDate(ataDate) : '', // 10% still in transit
    DELIVERY: Math.random() > 0.15 ? generateDate(deliveryDate) : '', // 15% not yet delivered
    DOCDT: generateDocDate(docRecdDate),
    CITYCODE: pol.code,
    ORIGIN: pol.name,
    SHPTSTATUS: randomFrom(SHIPMENT_STATUSES),
    // Financial fields (these might be in a separate table in real DB)
    REVENUE: revenue,
    PROFIT: profit,
    COST: cost,
    // Emissions (calculated in dashboard-logic.ts but we can add base values)
    CO2_EMISSIONS: null, // Let dashboard calculate
  }
}

// Main export: Generate array of mock shipments
export const generateMockShipments = (count: number = 1000): any[] => {
  console.log(`Generating ${count} mock shipments for DEMO mode...`)
  
  const shipments = []
  for (let i = 0; i < count; i++) {
    shipments.push(generateShipment(i))
  }
  
  console.log(`✓ Generated ${shipments.length} mock shipments`)
  console.log(`  - Modes: SEA (60%), AIR (25%), SEA-AIR (10%), ROAD (5%)`)
  console.log(`  - Carriers: ${SHIPPING_LINES.length} shipping lines, ${AIRLINES.length} airlines, ${TRUCKING_COMPANIES.length} trucking companies`)
  console.log(`  - Ports: ${getAllPorts().length} worldwide ports`)
  console.log(`  - Date range: Last 24 months`)
  
  return shipments
}
