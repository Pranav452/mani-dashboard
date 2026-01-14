import { parse, isValid, isWithinInterval, startOfDay, endOfDay } from "date-fns"

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

export const getValidDate = (row: any) => {
  if (!row) return null
  
  // Priority: Actual dates first, then Estimated, then Docs
  // Added ETA/ATA to the candidate list as they are in your SQL now
  const candidates = [row.ATD, row.ATA, row.ETD, row.ETA, row.DOCRECD, row.DOCDT]
  
  for (const dateStr of candidates) {
    if (!dateStr) continue;
    
    try {
      // 1. Handle "dd/MM/yyyy" (Your SQL format: 17/01/2024)
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parsed = parse(dateStr, 'dd/MM/yyyy', new Date())
        if (isValid(parsed)) return parsed
      }

      // 2. Handle "dd-MM-yyyy" (Legacy format support)
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parsed = parse(dateStr, 'dd-MM-yyyy', new Date())
        if (isValid(parsed)) return parsed
      }

      // 3. Handle ISO string or JS Date object
      if (dateStr instanceof Date) return dateStr
      
      // 4. Handle "yyyyMMdd" (e.g. 20240117)
      const str = String(dateStr)
      if (str.length === 8 && !isNaN(Number(str))) {
        const parsed = parse(str, 'yyyyMMdd', new Date())
        if (isValid(parsed)) return parsed
      }
    } catch (e) { continue }
  }
  return null
}

export const getComputedMode = (row: any) => {
  try {
    const isDiffAir = String(row.ISDIFFAIR || '').toUpperCase();
    if (isDiffAir === '2' || isDiffAir === 'YES') return 'SEA-AIR';
    if (isDiffAir === '0') return 'SEA'; // Explicit 0 is Sea
    
    return row.MODE || 'Unknown';
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

// --- 3. FINANCIALS ---
export const generateFinancials = (row: any) => {
  // Pure DB Read. 
  return {
    revenue: cleanNum(row.REVENUE || row.Revenue || 0),
    profit: cleanNum(row.PROFIT || row.Profit || 0),
    cost: cleanNum(row.COST || row.Cost || 0)
  };
}

// --- 4. EMISSIONS ---
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

// --- 5. FILTERING ---
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
