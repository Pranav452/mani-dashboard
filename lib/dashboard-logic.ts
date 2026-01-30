import { parse, isValid, isWithinInterval, startOfDay, endOfDay, differenceInDays } from "date-fns"

// --- 1. CLEANING UTILS ---
export const cleanNum = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  try {
    const str = String(val).replace(/,/g, '')
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  } catch (e) { return 0 }
}

// Helper: Parse a single value into a Date
export const parseDateValue = (val: any): Date | null => {
  if (!val) return null
  try {
    // 1. Handle "dd/MM/yyyy" (SQL format)
    if (typeof val === 'string' && val.includes('/')) {
      const parsed = parse(val, 'dd/MM/yyyy', new Date())
      if (isValid(parsed)) return parsed
    }

    // 2. Handle "dd-MM-yyyy" (legacy)
    if (typeof val === 'string' && val.includes('-')) {
      const parsed = parse(val, 'dd-MM-yyyy', new Date())
      if (isValid(parsed)) return parsed
    }

    // 3. Handle JS Date object
    if (val instanceof Date) return val

    // 4. Handle "yyyyMMdd" (e.g. 20240117)
    const str = String(val)
    if (str.length === 8 && !isNaN(Number(str))) {
      const parsed = parse(str, 'yyyyMMdd', new Date())
      if (isValid(parsed)) return parsed
    }
  } catch (e) {
    return null
  }
  return null
}

export const getValidDate = (row: any) => {
  if (!row) return null
  
  // Priority: Actual dates first, then Estimated, then Docs
  // Added ETA/ATA to the candidate list as they are in your SQL now
  const candidates = [row.ATD, row.ATA, row.ETD, row.ETA, row.DOCRECD, row.DOCDT]
  
  for (const dateStr of candidates) {
    const date = parseDateValue(dateStr)
    if (date) return date
  }
  return null
}

export const getComputedMode = (row: any) => {
  try {
    // Since MODE is already computed in SQL query (CASE WHEN MODE='SEA' AND ISDIFFAIR='2' THEN 'SEA-AIR' ELSE MODE END),
    // we should trust the MODE value from the database
    // Only handle edge cases where MODE might not be set correctly
    
    const mode = String(row.MODE || '').toUpperCase().trim();
    const isDiffAir = String(row.ISDIFFAIR || '').toUpperCase();
    
    // If MODE is already SEA-AIR, keep it
    if (mode === 'SEA-AIR') return 'SEA-AIR';
    
    // If MODE is SEA and ISDIFFAIR is '2' or 'YES', it should be SEA-AIR
    // (This handles cases where SQL CASE might not have caught it)
    if (mode === 'SEA' && (isDiffAir === '2' || isDiffAir === 'YES')) {
      return 'SEA-AIR';
    }
    
    // Otherwise, trust the MODE from database (AIR, SEA, etc.)
    return mode || 'Unknown';
  } catch (e) { return 'Unknown' }
}

// --- 2. TEU LOGIC (BOSS APPROVED) ---
// Implements the exact CASE statement from your SQL snippet
export const calculateTEU = (size: string, status: string, mode: string) => {
  // Only SEA shipments count towards TEU
  if (mode !== 'SEA' && mode !== 'SEA-AIR') return 0;

  const s = (size || '').toUpperCase().trim();
  const st = (status || '').toUpperCase().trim();

  // BOSS LOGIC IMPLEMENTATION
  if (s === '20F') {
    if (st === 'LCL/LCL') return 0;
    if (st === 'LCL/FCL') return 1;
    if (st === 'FCL/FCL') return 1;
  }
  
  if (s === '20H') {
    if (st === 'LCL/LCL') return 0;
    if (st === 'LCL/FCL') return 2;
    if (st === 'FCL/FCL') return 2;
  }

  if (s === '40F') {
    if (st === 'LCL/LCL') return 0;
    if (st === 'LCL/FCL') return 2;
    if (st === 'FCL/FCL') return 2;
  }

  if (s === '40H') {
    if (st === 'LCL/LCL') return 0;
    if (st === 'LCL/FCL') return 2;
    if (st === 'FCL/FCL') return 2;
  }

  // Explicit Special Cases
  if (s === '20G') return 2;
  if (s === '40G') return 2;

  // Fallback for standard sizes if strict match fails but pattern exists
  if (s.includes('20')) return 1;
  if (s.includes('40')) return 2;

  return 0;
}

export const calculateUniqueTEU = (data: any[]) => {
  const uniqueContainers = new Map<string, number>();

  data.forEach(row => {
    // Use CONNO as primary key, fallback to CONTMAWB
    const containerNo = row.CONNO || row.CONTMAWB || `UNKNOWN-${row.JOBNO}`;

    if (!uniqueContainers.has(containerNo)) {
      const mode = getComputedMode(row);
      const size = row.CONT_CONTSIZE;
      const status = row.CONT_CONTSTATUS;

      // Use the helper above to ensure logic is identical
      const teu = calculateTEU(size, status, mode);
      
      uniqueContainers.set(containerNo, teu);
    }
  });

  let totalTEU = 0;
  uniqueContainers.forEach((teu) => totalTEU += teu);
  return totalTEU;
}

// --- 3. TRANSIT STATS (EXTENDED) ---
export const calculateTransitStats = (data: any[]) => {
  let totalDays = 0
  let count = 0
  let min = Number.POSITIVE_INFINITY
  let max = 0
  const validTransits: number[] = [] // For median/stddev

  let onTimeCount = 0
  let onTimeBase = 0

  const legsAcc = {
    pickupToArrival: { total: 0, count: 0, values: [] as number[] },
    pickupToDelivery: { total: 0, count: 0, values: [] as number[] },
    depToArrival: { total: 0, count: 0, values: [] as number[] },
    depToDelivery: { total: 0, count: 0, values: [] as number[] },
  }

  // MoM/YoY tracking (all 4 legs)
  const monthly = {
    depToArrival: new Map<string, { total: number; count: number }>(),
    pickupToArrival: new Map<string, { total: number; count: number }>(),
    depToDelivery: new Map<string, { total: number; count: number }>(),
    pickupToDelivery: new Map<string, { total: number; count: number }>(),
  }

  const yearly = {
    depToArrival: new Map<string, { total: number; count: number }>(),
    pickupToArrival: new Map<string, { total: number; count: number }>(),
    depToDelivery: new Map<string, { total: number; count: number }>(),
    pickupToDelivery: new Map<string, { total: number; count: number }>(),
  }

  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  
  const yearKey = (d: Date) => `${d.getFullYear()}`

  const diff = (start: Date | null, end: Date | null) => {
    if (start && end && end >= start) return differenceInDays(end, start)
    return null
  }

  const pushPeriod = (map: Map<string, { total: number; count: number }>, key: string, val: number) => {
    const prev = map.get(key) || { total: 0, count: 0 }
    map.set(key, { total: prev.total + val, count: prev.count + 1 })
  }

  data.forEach((row) => {
    const atd = parseDateValue(row.ATD)
    const ata = parseDateValue(row.ATA)
    const eta = parseDateValue(row.ETA)
    const delivery = parseDateValue(row.DELIVERY)
    const cargoRecpt = parseDateValue(row.CARGORECPT)

    // 1) Core Transit (ATD -> ATA) - MUST match DAX validity
    const transit = diff(atd, ata)
    if (transit !== null && transit >= 0 && transit < 150) {
      totalDays += transit
      count++
      validTransits.push(transit)
      if (transit < min) min = transit
      if (transit > max) max = transit

      legsAcc.depToArrival.total += transit
      legsAcc.depToArrival.count++
      legsAcc.depToArrival.values.push(transit)

      if (ata) {
        pushPeriod(monthly.depToArrival, monthKey(ata), transit)
        pushPeriod(yearly.depToArrival, yearKey(ata), transit)
      }
    }

    // 2) On-time (ATA <= ETA)
    if (ata && eta) {
      onTimeBase++
      if (ata <= eta) onTimeCount++
    }

    // 3) Legs
    const p2a = diff(cargoRecpt, ata)
    if (p2a !== null && p2a >= 0 && p2a < 365) {
      legsAcc.pickupToArrival.total += p2a
      legsAcc.pickupToArrival.count++
      legsAcc.pickupToArrival.values.push(p2a)
      if (ata) {
        pushPeriod(monthly.pickupToArrival, monthKey(ata), p2a)
        pushPeriod(yearly.pickupToArrival, yearKey(ata), p2a)
      }
    }

    const p2d = diff(cargoRecpt, delivery)
    if (p2d !== null && p2d >= 0 && p2d < 365) {
      legsAcc.pickupToDelivery.total += p2d
      legsAcc.pickupToDelivery.count++
      legsAcc.pickupToDelivery.values.push(p2d)
      if (delivery) {
        pushPeriod(monthly.pickupToDelivery, monthKey(delivery), p2d)
        pushPeriod(yearly.pickupToDelivery, yearKey(delivery), p2d)
      }
    }

    const d2d = diff(atd, delivery)
    if (d2d !== null && d2d >= 0 && d2d < 365) {
      legsAcc.depToDelivery.total += d2d
      legsAcc.depToDelivery.count++
      legsAcc.depToDelivery.values.push(d2d)
      if (delivery) {
        pushPeriod(monthly.depToDelivery, monthKey(delivery), d2d)
        pushPeriod(yearly.depToDelivery, yearKey(delivery), d2d)
      }
    }
  })

  // Compute median (from validTransits array)
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  // Compute stddev population (match STDEVX.P)
  const stddev = (arr: number[], avg: number) => {
    if (arr.length === 0) return 0
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length
    return Math.sqrt(variance)
  }

  const avg = count > 0 ? totalDays / count : 0
  const minDays = Number.isFinite(min) ? min : 0
  const maxDays = max
  const medianDays = median(validTransits)
  const stddevDays = stddev(validTransits, avg)

  // Compute MoM/YoY changes for all legs
  const computeChange = (
    monthMap: Map<string, { total: number; count: number }>,
    yearMap: Map<string, { total: number; count: number }>
  ) => {
    const months = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b))
    const years = Array.from(yearMap.keys()).sort((a, b) => a.localeCompare(b))
    
    const currentMonth = months[months.length - 1]
    const prevMonth = months.length > 1 ? months[months.length - 2] : null
    const currentYear = years[years.length - 1]
    const prevYear = years.length > 1 ? years[years.length - 2] : null

    let momDays = 0, momPct = 0, hasMom = false
    if (currentMonth && prevMonth) {
      const cur = monthMap.get(currentMonth)!
      const prev = monthMap.get(prevMonth)!
      const curAvg = cur.count > 0 ? cur.total / cur.count : 0
      const prevAvg = prev.count > 0 ? prev.total / prev.count : 0
      momDays = curAvg - prevAvg
      momPct = prevAvg !== 0 ? (momDays / prevAvg) * 100 : 0
      hasMom = true
    }

    let yoyDays = 0, yoyPct = 0, hasYoy = false
    if (currentYear && prevYear) {
      const cur = yearMap.get(currentYear)!
      const prev = yearMap.get(prevYear)!
      const curAvg = cur.count > 0 ? cur.total / cur.count : 0
      const prevAvg = prev.count > 0 ? prev.total / prev.count : 0
      yoyDays = curAvg - prevAvg
      yoyPct = prevAvg !== 0 ? (yoyDays / prevAvg) * 100 : 0
      hasYoy = true
    }

    return { hasMom, momDays, momPct, hasYoy, yoyDays, yoyPct }
  }

  const changeDepArr = computeChange(monthly.depToArrival, yearly.depToArrival)
  const changePickupArr = computeChange(monthly.pickupToArrival, yearly.pickupToArrival)
  const changeDepDel = computeChange(monthly.depToDelivery, yearly.depToDelivery)
  const changePickupDel = computeChange(monthly.pickupToDelivery, yearly.pickupToDelivery)

  return {
    avg,
    min: minDays,
    max: maxDays,
    median: medianDays,
    stddev: stddevDays,
    transitShipmentCount: count,
    onTimeShipments: onTimeCount,
    onTimeBase: onTimeBase,
    onTimePct: onTimeBase > 0 ? (onTimeCount / onTimeBase) * 100 : 0,
    legs: {
      pickupToArrival: legsAcc.pickupToArrival.count > 0 ? legsAcc.pickupToArrival.total / legsAcc.pickupToArrival.count : 0,
      pickupToDelivery: legsAcc.pickupToDelivery.count > 0 ? legsAcc.pickupToDelivery.total / legsAcc.pickupToDelivery.count : 0,
      depToArrival: legsAcc.depToArrival.count > 0 ? legsAcc.depToArrival.total / legsAcc.depToArrival.count : 0,
      depToDelivery: legsAcc.depToDelivery.count > 0 ? legsAcc.depToDelivery.total / legsAcc.depToDelivery.count : 0,
    },
    changes: {
      depToArrival: changeDepArr,
      pickupToArrival: changePickupArr,
      depToDelivery: changeDepDel,
      pickupToDelivery: changePickupDel,
    },
  }
}

// --- 4. LINER STATS ---
export const calculateLinerStats = (data: any[]) => {
  const linerMap = new Map<string, { total: number; count: number; shipments: number }>()

  data.forEach((row) => {
    const liner = row.LINER_NAME || row.LINER_CODE || 'Unknown'
    const atd = parseDateValue(row.ATD)
    const ata = parseDateValue(row.ATA)

    if (!linerMap.has(liner)) {
      linerMap.set(liner, { total: 0, count: 0, shipments: 0 })
    }

    const stats = linerMap.get(liner)!
    stats.shipments++

    // Only count valid transit (ATD & ATA present, ATA >= ATD)
    if (atd && ata && ata >= atd) {
      const days = differenceInDays(ata, atd)
      if (days >= 0 && days < 150) {
        stats.total += days
        stats.count++
      }
    }
  })

  const liners = Array.from(linerMap.entries())
    .map(([liner, stats]) => ({
      liner,
      avgTransit: stats.count > 0 ? stats.total / stats.count : 0,
      shipments: stats.shipments,
      validTransitCount: stats.count
    }))
    .filter(l => l.validTransitCount > 0 && l.liner !== 'Unknown' && l.liner !== 'UNKNOWN') // Only include liners with valid transit data, exclude Unknown
    .sort((a, b) => a.avgTransit - b.avgTransit)

  const bestLiner = liners[0] || null
  const worstLiner = liners[liners.length - 1] || null

  return {
    bestLiner,
    worstLiner,
    topLiners: liners.slice(0, 5),
    bottomLiners: liners.slice(-5).reverse(),
    allLiners: liners
  }
}

// --- 5. FINANCIALS ---
export const generateFinancials = (row: any) => {
  // Pure DB Read. 
  return {
    revenue: cleanNum(row.REVENUE || row.Revenue || 0),
    profit: cleanNum(row.PROFIT || row.Profit || 0),
    cost: cleanNum(row.COST || row.Cost || 0)
  };
}

// --- 6. EMISSIONS ---
export const generateEmissions = (row: any) => {
  if (row.CO2_EMISSIONS || row.Co2_Emissions) {
      return { co2: cleanNum(row.CO2_EMISSIONS || row.Co2_Emissions), distance: 0 }
  }

  // Fallback: Weight is in TONS now, so NO divide by 1000 needed
  const weightTons = cleanNum(row.CONT_GRWT); 
  const mode = getComputedMode(row);
  
  let distance = 0;
  let factor = 0;

  if (mode === 'AIR') { distance = 6000; factor = 0.5; } 
  else if (mode === 'ROAD' || mode === 'TRUCK') { distance = 1500; factor = 0.1; } 
  else { distance = 12000; factor = 0.015; }

  return {
    co2: Math.round(weightTons * distance * factor),
    distance: distance
  }
}

// --- 7. FILTERING ---
export const filterData = (data: any[], mode: string, client: string, dateRange: { from?: Date, to?: Date }) => {
  return data.filter(row => {
    if (mode !== "ALL" && row._mode !== mode) return false
    if (dateRange.from && dateRange.to) {
      if (!row._date) return false
      if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false
    }
    if (client !== "ALL" && row.CONNAME !== client) return false
    return true
  })
}
