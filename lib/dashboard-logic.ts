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
  const candidates = [row.ETD, row.ATD, row.DOCRECD, row.DOCDT]
  for (const dateStr of candidates) {
    if (!dateStr) continue;
    try {
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parsed = parse(dateStr, 'dd-MM-yyyy', new Date())
        if (isValid(parsed)) return parsed
      }
      if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !dateStr.includes('-'))) {
        const str = String(dateStr)
        if (str.length === 8) {
          const parsed = parse(str, 'yyyyMMdd', new Date())
          if (isValid(parsed)) return parsed
        }
      }
    } catch (e) { continue }
  }
  return null
}

export const getComputedMode = (row: any) => {
  try {
    const isDiffAir = String(row.ISDIFFAIR || '').toUpperCase();
    if (isDiffAir === '2' || isDiffAir === 'YES' || isDiffAir === '1') return 'SEA-AIR';
    return row.MODE || 'Unknown';
  } catch (e) { return 'Unknown' }
}

// --- 2. SIMPLE TEU LOGIC (per-shipment, deterministic) ---
// Used by the dashboard to derive a TEU value from a single row.
// This is a pure helper: no randomness, no side effects.
export const calculateTEU = (size: string, status: string, mode: string) => {
  // Only SEA shipments count towards TEU here
  if (mode !== 'SEA') return 0;

  const s = (size || '').toUpperCase();
  const st = (status || '').toUpperCase().trim();

  // LCL/LCL = 0
  if (st === 'LCL/LCL') return 0;

  // 20ft Logic
  if (s.includes('20')) return 1;

  // 40ft Logic
  if (s.includes('40')) return 2;

  return 0;
}

// --- 2b. TEU LOGIC (Deduplicated - Fixes container duplication bug) ---
// This function correctly counts TEUs by deduplicating containers first
// Implements Happy Chic custom logic and is deterministic.
export const calculateUniqueTEU = (data: any[]) => {
  const uniqueContainers = new Map<string, number>();

  data.forEach(row => {
    const containerNo = row.CONNO || row.CONTMAWB || `UNKNOWN-${row.JOBNO}`;

    if (!uniqueContainers.has(containerNo)) {
      const mode = getComputedMode(row);

      // Non-SEA shipments = 0 TEU
      if (mode !== 'SEA') {
        uniqueContainers.set(containerNo, 0);
        return;
      }

      const size = (row.CONT_CONTSIZE || '').toUpperCase().trim();
      const status = (row.CONT_CONTSTATUS || '').toUpperCase().trim();

      let teu = 0;

      // Happy Chic Logic Implementation
      if (size === '20G' || size === '40G') {
        teu = 2;
      } 
      else if (size === '20F') {
        if (status === 'LCL/LCL') teu = 0;
        else if (status === 'LCL/FCL' || status === 'FCL/FCL') teu = 1;
      }
      else if (size === '20H') {
        if (status === 'LCL/LCL') teu = 0;
        else if (status === 'LCL/FCL' || status === 'FCL/FCL') teu = 2;
      }
      else if (size === '40F') {
        if (status === 'LCL/LCL') teu = 0;
        else if (status === 'LCL/FCL' || status === 'FCL/FCL') teu = 2;
      }
      else if (size === '40H') {
        if (status === 'LCL/LCL') teu = 0;
        else if (status === 'LCL/FCL' || status === 'FCL/FCL') teu = 2;
      }
      // Fallback for standard sizes if not matched above but contains 20/40
      else {
         if (size.includes('20')) teu = 1;
         else if (size.includes('40')) teu = 2;
      }

      uniqueContainers.set(containerNo, teu);
    }
  });

  let totalTEU = 0;
  uniqueContainers.forEach((teu) => totalTEU += teu);
  return totalTEU;
}

// --- 3. PURE DB FINANCIALS (NO RANDOMIZATION) ---
export const generateFinancials = (row: any) => {
  // Try to read columns if they exist, otherwise 0.
  // No mock or random variance – this is a pure read of DB state.
  return {
    revenue: cleanNum(row.REVENUE || row.TOTAL_AMOUNT || 0),
    profit: cleanNum(row.PROFIT || row.MARGIN || 0),
    cost: cleanNum(row.COST || row.EXPENSE || 0)
  };
}

// --- 4. PURE / DETERMINISTIC EMISSIONS ---
export const generateEmissions = (row: any) => {
  // If DB has CO2, use it directly.
  if (row.CO2_EMISSIONS) {
      return { co2: cleanNum(row.CO2_EMISSIONS), distance: 0 }
  }

  // Fallback: deterministic calculation based only on weight + mode.
  const weight = cleanNum(row.CONT_GRWT) / 1000;
  const mode = getComputedMode(row);
  
  let distance = 0;
  let factor = 0;

  if (mode === 'AIR') { distance = 6000; factor = 0.5; } 
  else if (mode === 'ROAD' || mode === 'TRUCK') { distance = 1500; factor = 0.1; } 
  else { distance = 12000; factor = 0.015; }

  return {
    co2: Math.round(weight * distance * factor),
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
