'use client'

import { useState } from "react";
import { PremiumPageShell } from "@/components/PremiumPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Ship, UploadCloud, Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseExcel, normalizeKeys, exportData } from "@/lib/excel-utils";

// --- Types ---
interface TrackResult {
  id?: number;
  container: string;
  carrier: string;
  status: string;
  liveEta: string;
  summary: string;
  co2: string;
  loading: boolean;
  selected?: boolean;
}

export default function TrackTracePage() {
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [containerInput, setContainerInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [results, setResults] = useState<TrackResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Helper to Map Excel Rows to State ---
  const mapRowsToShipments = (data: any[]): TrackResult[] => {
    return data.map((row: any, index: number) => {
      const norm = normalizeKeys(row);
      let carrier = String(norm.carrier || "Unknown").toUpperCase();
      
      // Simple carrier cleaning
      if (carrier.includes("HAPAG")) carrier = "HAPAG-LLOYD";
      else if (carrier.includes("MSC")) carrier = "MSC";
      else if (carrier.includes("MAERSK")) carrier = "MAERSK";
      else if (carrier.includes("CMA")) carrier = "CMA CGM";

      const rawTracking = String(norm.trackingNumber || "").trim().toUpperCase();

      return {
        id: index,
        container: rawTracking,
        carrier: carrier,
        status: "Pending",
        liveEta: "-",
        summary: "Ready to track",
        co2: "-",
        loading: false,
        selected: true
      };
    }).filter(s => s.container && s.container.length > 5);
  };

  // --- Handlers ---
  
  const handleSingleTrack = async () => {
    if (!containerInput) return;
    
    const newEntry: TrackResult = {
      container: containerInput,
      carrier: carrierInput || "Auto-detect",
      status: "Processing...",
      liveEta: "-",
      summary: "Connecting to carrier API...",
      co2: "-",
      loading: true
    };

    setResults(prev => [newEntry, ...prev]);
    setIsProcessing(true);

    try {
      // Call our Next.js Proxy
      const res = await fetch("/api/proxy/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: containerInput,
          carrier: carrierInput,
          system_eta: "N/A"
        })
      });
      
      const data = await res.json();
      
      // Update result
      setResults(prev => prev.map(r => 
        r.container === containerInput ? {
          ...r,
          loading: false,
          status: data.status || "Error",
          liveEta: data.live_eta || "N/A",
          summary: data.smart_summary || data.message || "No info found",
          co2: data.co2 || "N/A"
        } : r
      ));

    } catch (e) {
      setResults(prev => prev.map(r => 
        r.container === containerInput ? { ...r, loading: false, status: "Error", summary: "Network failed" } : r
      ));
    } finally {
      setIsProcessing(false);
      setContainerInput(""); 
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    try {
      const data = await parseExcel(e.target.files[0]);
      const mapped = mapRowsToShipments(data);
      setResults(mapped);
    } catch (err) {
      console.error("Parse error", err);
      alert("Failed to parse Excel file");
    } finally {
      setIsProcessing(false);
    }
  };

  const startBulkTracking = async () => {
    setIsProcessing(true);

    // Process sequentially to avoid overwhelming the proxy/ngrok
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      
      // Update UI to show loading for this specific item
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, loading: true, status: "Checking..." } : r));

      try {
        const res = await fetch("/api/proxy/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: item.container,
            carrier: item.carrier,
            system_eta: "N/A"
          })
        });

        const data = await res.json();

        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          loading: false,
          status: data.status || "Error",
          liveEta: data.live_eta || "N/A",
          summary: data.smart_summary || data.message || "No data",
          co2: data.co2 || "N/A"
        } : r));

      } catch (e) {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, loading: false, status: "Error" } : r));
      }
    }
    setIsProcessing(false);
  };

  const handleExportResults = () => {
    const exportDataList = results.map(s => ({
      "Container": s.container,
      "Carrier": s.carrier,
      "Status": s.status,
      "Live ETA": s.liveEta,
      "Summary": s.summary,
      "CO2": s.co2
    }));
    exportData(exportDataList);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing && containerInput) {
      handleSingleTrack();
    }
  };

  // --- UI Components ---

  const trackingInterface = (
    <div className="space-y-8">
      {/* Simple Header */}
      <div className="text-center space-y-3 py-4">
        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Track & Trace</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Real-time container tracking powered by AI
        </p>
      </div>
      {/* Input Zone */}
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
        <CardContent className="p-6">
          <div className="flex gap-4 mb-6 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <button 
              onClick={() => setInputMode("single")}
              className={cn(
                "text-sm font-medium pb-4 -mb-4 transition-colors",
                inputMode === 'single' 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              Single Track
            </button>
            <button 
              onClick={() => setInputMode("bulk")}
              className={cn(
                "text-sm font-medium pb-4 -mb-4 transition-colors",
                inputMode === 'bulk' 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              Bulk Upload
            </button>
          </div>

          {inputMode === 'single' ? (
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Container Number</label>
                <Input 
                  placeholder="e.g. MSCU1234567" 
                  value={containerInput}
                  onChange={(e) => setContainerInput(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="font-mono"
                />
              </div>
              <div className="w-full md:w-48 space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Carrier (Optional)</label>
                <Input 
                  placeholder="Auto-detect" 
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button 
                onClick={handleSingleTrack} 
                disabled={isProcessing || !containerInput}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] w-full md:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Track
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <input type="file" className="hidden" id="bulk-upload" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                <label htmlFor="bulk-upload" className="cursor-pointer block">
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload Excel / CSV</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop or click to browse</p>
                </label>
              </div>
              
              {/* Bulk Actions */}
              {results.length > 0 && inputMode === 'bulk' && (
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={startBulkTracking} 
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing {results.filter(r => r.status !== "Pending").length}/{results.length}
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleExportResults} 
                    variant="outline"
                    className="border-slate-200 dark:border-zinc-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Container</th>
                  <th className="px-6 py-3">Carrier</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Live ETA</th>
                  <th className="px-6 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-slate-100">{res.container}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{res.carrier}</td>
                    <td className="px-6 py-4">
                      {res.loading ? (
                        <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          res.status.toLowerCase().includes('arrived') || res.status.toLowerCase().includes('delivered') 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          res.status.toLowerCase().includes('error') || res.status.toLowerCase().includes('not found')
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        )}>
                          {res.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 tabular-nums">{res.liveEta}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={res.summary}>{res.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {results.length === 0 && (
        <Card className="border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 shadow-none">
          <CardContent className="p-12 text-center">
            <Ship className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">No tracking results yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enter a container number above to start tracking</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <PremiumPageShell
      title="Track & Trace"
      description="Live container tracking via official carrier APIs."
      filters={null}
      sections={[
        { title: "", content: trackingInterface }
      ]}
      active="tracking"
      columns={1}
    />
  );
}
