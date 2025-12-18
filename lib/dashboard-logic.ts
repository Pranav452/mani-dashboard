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

// --- 2. TEU LOGIC (The Happychic Rule) ---
export const calculateTEU = (size: string, status: string, mode: string) => {
  // If not SEA, usually 0 TEU (unless specific logic provided)
  if (mode !== 'SEA') return 0;

  const s = (size || '').toUpperCase();
  const st = (status || '').toUpperCase().trim();

  // LCL/LCL = 0
  if (st === 'LCL/LCL') return 0;

  // 20ft Logic
  if (s.includes('20')) return 1;

  // 40ft Logic
  if (s.includes('40')) return 2;

  return 0; // Default
}

// --- 2b. TEU LOGIC (Deduplicated - Fixes container duplication bug) ---
// This function correctly counts TEUs by deduplicating containers first
// Implements Happy Chic custom logic:
// 20F/20H/40F/40H vary by status (LCL/LCL=0, LCL/FCL=1 or 2, FCL/FCL=1 or 2)
// 20G/40G = 2
// Only MODE='SEA'
export const calculateUniqueTEU = (data: any[]) => {
  const uniqueContainers = new Map<string, number>(); // Key: CONNO, Value: TEU for that container

  data.forEach(row => {
    // Use CONNO as primary identifier, fallback to CONTMAWB, then generate unique key
    const containerNo = row.CONNO || row.CONTMAWB || `UNKNOWN-${row.JOBNO}`;
    
    // Only calculate if we haven't seen this container yet
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
        teu = 2; // Explicitly requested 2 for 20G as well
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

  // Sum up the unique TEUs
  let totalTEU = 0;
  uniqueContainers.forEach((teu) => totalTEU += teu);
  return totalTEU;
}

// --- 3. MOCK FINANCIAL GENERATOR ---
// Generates realistic numbers based on current market rates (2024/2025)
// Values are designed to be "client-ready" - reasonable margins, standard rates
export const generateFinancials = (row: any) => {
  const weight = cleanNum(row.CONT_GRWT);
  const mode = getComputedMode(row);

  // Market Rates (USD per kg)
  // Air: $3.50 - $5.50
  // Sea: $0.15 - $0.30 (approx $3000 for 20ft container / 15000kg)
  // Road: $0.40 - $0.80
  let rate = 0.20; // Default Sea
  let marginPct = 0.12; // 12% standard margin

  if (mode === 'AIR') {
      rate = 4.20; 
      marginPct = 0.18; // Air has higher margins
  } else if (mode === 'SEA-AIR') {
      rate = 2.80;
      marginPct = 0.15;
  } else if (mode === 'ROAD' || mode === 'TRUCK') {
      rate = 0.65;
      marginPct = 0.10;
  }

  // Add realistic variance (+/- 10%) so it doesn't look generated
  const variance = 0.9 + Math.random() * 0.2; 
  
  const revenue = weight * rate * variance;
  const profit = revenue * marginPct; 
  const cost = revenue - profit;

  return {
    revenue: Math.round(revenue),
    profit: Math.round(profit),
    cost: Math.round(cost)
  };
}

// --- 4. MOCK ENVIRONMENTAL GENERATOR ---
export const generateEmissions = (row: any) => {
  const weight = cleanNum(row.CONT_GRWT) / 1000; // Tons
  const mode = getComputedMode(row);

  // CO2 factors (kg CO2 per ton-km)
  // Air: ~500g (0.5kg), Sea: ~15g (0.015kg), Road: ~100g (0.1kg)
  let distance = 0;
  let factor = 0;

  if (mode === 'AIR') {
    distance = 6000; // Avg Air distance
    factor = 0.5;
  } else if (mode === 'ROAD' || mode === 'TRUCK') {
    distance = 1500; // Avg Road distance
    factor = 0.1;
  } else {
    // Sea default
    distance = 12000; // Avg Sea distance
    factor = 0.015;
  }

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
