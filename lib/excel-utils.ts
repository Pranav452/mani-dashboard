import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Helper to convert Excel Serial Date to String
const excelDateToJSDate = (serial: any) => {
   if (!serial || isNaN(serial)) return serial; 
   const utc_days  = Math.floor(serial - 25569);
   const utc_value = utc_days * 86400;
   const date_info = new Date(utc_value * 1000);
   return date_info.toLocaleDateString('en-GB');
}

// --- PARSING ---
export const parseExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        let headerRowIndex = 0;
        let foundHeaders = false;

        // Hunt for the real header row
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const rowStr = JSON.stringify(rawData[i]).toLowerCase();
          if (rowStr.includes("container") || rowStr.includes("shipping") || rowStr.includes("carrier")) {
            headerRowIndex = i;
            foundHeaders = true;
            break;
          }
        }

        let jsonData;
        if (foundHeaders) {
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          range.s.r = headerRowIndex;
          const newRef = XLSX.utils.encode_range(range);
          jsonData = XLSX.utils.sheet_to_json(sheet, { range: newRef });
        } else {
          jsonData = XLSX.utils.sheet_to_json(sheet);
        }

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

// --- NORMALIZATION ---
export const normalizeKeys = (row: any) => {
  const newRow: any = {};

  Object.keys(row).forEach((key) => {
    const lower = key.toLowerCase().trim();

    if (lower.includes('container') || lower.includes('booking')) newRow.trackingNumber = row[key];
    else if (lower.includes('shipping line') || lower === 'carrier') newRow.carrier = row[key];
    else if (lower === 'eta') {
        newRow.systemEta = excelDateToJSDate(row[key]);
    }
    else newRow[key] = row[key]; 
  });

  return newRow;
};

// --- EXPORTING ---
export const exportData = (data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tracking Results");

  const fileName = `Tracking_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
};
