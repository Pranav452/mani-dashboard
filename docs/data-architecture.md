## Overview

This document captures all of the assumptions, patterns, and logic that were previously embedded in mock/demo data, as well as what the current “empty shell” frontend expects from real data.

The goal is to give future backend/API work a single, comprehensive reference so that:

- Real data can be wired in without guessing how the UI is supposed to behave.
- We avoid re‑introducing randomisation or hardcoded demo numbers.
- The SQL Server + Supabase‑auth architecture can be designed to match the frontend’s expectations.

The current state of the app is:

- **Shipments / dashboards**: expect a `data` array of shipment rows; currently provided as an empty array.
- **Chat**: UI only; backend is stubbed and does not query any DB or LLM.
- **Fleet / Reports**: presentational shells with explicit “no data connected” messaging.
- **Supabase**: only the client helper exists (`lib/supabase.ts`); no production data paths use it. Future use is **auth only**.

---

## Core data model: shipments

The entire dashboard experience is built around an array of “shipment” rows. Today these come from `getShipments()` and are **normalized to uppercase keys** in `app/actions.ts`.

### Required and important columns

The following fields are read directly in `components/Dashboard.tsx` and/or the logic helpers in `lib/dashboard-logic.ts`:

- **Identification / keys**
  - `JOBNO`: Unique job/shipment identifier (string/number, castable to string).
  - `CONNO`: Container number (used to deduplicate TEUs).
  - `CONTMAWB`: Alternate container/MAWB identifier (used if `CONNO` is missing).

- **Mode & air/sea logic**
  - `MODE`: `'SEA'`, `'AIR'`, `'ROAD'`, `'TRUCK'`, etc.
  - `ISDIFFAIR`: `'1'`, `'2'`, `'YES'`, or empty. Used to derive `SEA-AIR` mode.

- **Client / carrier / office**
  - `CONNAME`: Client / shipper name.
  - `LINER_NAME`: Carrier name; if present and not `"0"`, it is preferred over `CONNAME` for carrier stats.
  - `POL`: Port of loading (used for office grouping and map origin stats).
  - `POD`: Port of discharge/destination (used for destination stats and maps).

- **Dates**
  - `ETD`, `ATD`, `DOCRECD`, `DOCDT`, optionally `ETA` / `ATA`:
    - May be stored as `dd-MM-yyyy` strings (e.g. `25-12-2024`).
    - Or as `yyyyMMdd` numeric / string codes (e.g. `20241225`).
    - `getValidDate(row)` tries these formats in order: `ETD`, `ATD`, `DOCRECD`, `DOCDT` and returns the first valid `Date`.
    - Transit time uses `ATD || ETD` as start and `ATA || ETA` as end, expecting `dd-MM-yyyy`.

- **Quantities / units**
  - `CONT_GRWT`: Gross weight in **kg**.
  - `CONT_TEU`: TEU count. May be text; `cleanNum` parses numeric value.
  - `CONT_CBM`: Volume in CBM.
  - `CONT_CONTSIZE`: Container size code (`20F`, `40H`, `20G`, etc.).
  - `CONT_CONTSTATUS`: Status string with combinations like `FCL/FCL`, `LCL/LCL`, etc.

- **Status / docs**
  - `SHPTSTATUS`: Shipment status label (e.g. `DELIVERED`, `BOOKING`) – currently only used in the detail drawer.
  - `DOCRECD`: Used as a boolean flag for “invoice processed” vs “pending” in the financials logic.

The frontend also computes a set of **derived fields** on each row in `Dashboard.tsx`:

- `_date`: canonical `Date` from `getValidDate(row)`.
- `_mode`: computed mode from `getComputedMode(row)`.
- `_carrier`: smart carrier name from `LINER_NAME` / `CONNAME` fallback.
- `_office`: derived from `POL` (Delhi/Mumbai/Chennai/etc.) via `getOffice`.
- `_teu`: simple per‑shipment TEU (see below).
- `_financials`: `{ revenue, profit, cost }` from `generateFinancials(row)`.
- `_env`: `{ co2, distance }` from `generateEmissions(row)`.

Backends providing data to the React components should aim to populate the raw columns; the derived fields are computed on the frontend.

---

## TEU logic

TEU is calculated in **two ways**, both deterministic and non‑random:

1. **Per‑row TEU** (`calculateTEU`)
   - Used in `Dashboard.tsx` for `_teu` on each row.
   - Logic:
     - Only counts for `mode === 'SEA'`.
     - Normalises `size` and `status` to uppercase.
     - If `status === 'LCL/LCL'` → `0` TEU.
     - If `size` contains `'20'` → `1` TEU.
     - If `size` contains `'40'` → `2` TEU.

2. **Deduplicated TEU** (`calculateUniqueTEU`)
   - Used for the overall dashboard KPI `kpis.teu`.
   - Deduplicates **containers** first by key:
     - `CONNO` → `CONTMAWB` → fallback `UNKNOWN-${JOBNO}`.
   - For each unique container, if its computed mode is not `'SEA'`, TEU is `0`.
   - Otherwise, uses detailed HappyChic rules:
     - `20G` / `40G` → `2` TEU.
     - `20F`: `LCL/LCL → 0`, `LCL/FCL` or `FCL/FCL → 1`.
     - `20H`: `LCL/LCL → 0`, `LCL/FCL` or `FCL/FCL → 2`.
     - `40F` / `40H`: `LCL/LCL → 0`, `LCL/FCL` or `FCL/FCL → 2`.
     - Fallback: if size contains `20` → `1`, if size contains `40` → `2`.
   - Sums TEU across all unique containers.

This logic should be considered the **ground truth** for TEU in future APIs (even if you eventually move it server‑side).

---

## Financial logic (previous mock vs. current)

Previously, `generateFinancials(row)` used **randomised rates** per mode (e.g. `$4.20/kg` for air, with ±10% variance) to generate “realistic‑looking” revenue/profit/cost.

That behaviour has been removed.

### Current behaviour (`lib/dashboard-logic.ts`)

`generateFinancials(row)` now performs a **pure DB read**:

```ts
export const generateFinancials = (row: any) => {
  return {
    revenue: cleanNum(row.REVENUE || row.TOTAL_AMOUNT || 0),
    profit: cleanNum(row.PROFIT || row.MARGIN || 0),
    cost: cleanNum(row.COST || row.EXPENSE || 0),
  };
};
```

Implications for backend design:

- If possible, populate these columns directly in SQL Server:
  - `REVENUE` or `TOTAL_AMOUNT` – total billing for the shipment.
  - `PROFIT` or `MARGIN` – profit amount (not percentage).
  - `COST` or `EXPENSE` – cost amount.
- If those fields are not available per shipment, you can:
  - Compute them in a stored procedure and return them as part of the dataset.
  - Or return `0` for missing values; the frontend will then show `$0` or “N/A” style states.

The **Financials dashboard** (`components/FinancialsDashboard.tsx`) expects:

- `kpis.revenue`, `kpis.profit`, `kpis.cost`, `kpis.pendingRevenue`, `kpis.completedRevenue` – all derived from `_financials` and `DOCRECD`.
  - `pendingRevenue`: sum of `revenue` where `DOCRECD` is empty/null.
  - `completedRevenue`: sum of `revenue` where `DOCRECD` is present.
  - `margin`: `profit / revenue` when `revenue > 0`.
- `monthlyTrend`: aggregated `revenue/profit/cost` per month (based on `_date`).

The UI now **never fakes** profit or cost; it uses exactly those numeric values.

---

## Environmental / emissions logic

Previously, emissions were always computed from weight and mode using fixed factors; that remains, but now the function also respects a real `CO2_EMISSIONS` column if present.

### Current behaviour (`generateEmissions`)

```ts
export const generateEmissions = (row: any) => {
  if (row.CO2_EMISSIONS) {
    return { co2: cleanNum(row.CO2_EMISSIONS), distance: 0 };
  }

  const weight = cleanNum(row.CONT_GRWT) / 1000; // tons
  const mode = getComputedMode(row);

  let distance = 0;
  let factor = 0;

  if (mode === "AIR") { distance = 6000; factor = 0.5; }
  else if (mode === "ROAD" || mode === "TRUCK") { distance = 1500; factor = 0.1; }
  else { distance = 12000; factor = 0.015; }

  return {
    co2: Math.round(weight * distance * factor),
    distance,
  };
};
```

Interpretation:

- If the DB already tracks CO₂ per shipment, **prefer `CO2_EMISSIONS`**.
- If not, this deterministic fallback is acceptable as a physics‑style estimate, but you may later choose to move it into SQL Server for consistency.

The **Environmental dashboard** uses:

- `kpis.co2`: total CO₂ (sum of `_env.co2`).
- `kpis.weight`: total weight.
- `kpis.shipments`: count of filtered rows.
- `modeStats`: count of shipments per `_mode`.
- `monthlyEmissions`: aggregated CO₂ tonnes per month and per mode group (SEA/AIR/ROAD).

All previous hardcoded “trees planted”, “clean fuel usage”, etc. have been replaced with `N/A` + explanatory text.

---

## Dashboard KPIs and expectations

### Main dashboard (`components/Dashboard.tsx`)

Key KPIs (all deterministic, **no randomness**):

- `kpis.shipments`: count of **unique jobs** (deduplicated by `JOBNO`).
- `kpis.weight`: sum of `CONT_GRWT` across unique jobs.
- `kpis.teu`: `calculateUniqueTEU(chartData)` across all rows.
- `kpis.cbm`: sum of `CONT_CBM` across unique jobs.
- `kpis.avgTransit`: average transit days using `ATD/ETD` → `ATA/ETA`, filtered to 0–150 days.
- `kpis.revenue/profit/co2`: aggregated from `_financials` and `_env`.

Trend and breakdowns:

- `monthlyTrend`: aggregated metric (weight/TEU/CBM/shipments) per `yyyy-MM` month.
- `modeStats`: unique‑job counts per `_mode`.
- `clientStats`: shipments and weight (tons) per `CONNAME`.
- `laneStats`: weight and shipment count per `POL → POD` lane.
- `originStats` / `destinationStats`: weight or count per port.
- `carrierStats`: shipment counts per `_carrier` (smart carrier name).
- `statusStats`: counts by simplified container status (`FCL`, `LCL`, `Empty`, `Other`).

UI notes:

- Former “demo” figures (e.g. On‑time %, Exceptions, Fleet Utilization, Sea Freight Yield, cash balance, paid/pending/unpaid amounts) are now **neutral (0 / N/A)** and should only be populated once real business rules exist.

---

## Fleet and Reports pages

### Fleet (`app/fleet/page.tsx`)

Current state:

- Pure shell:
  - `PremiumPageShell` with title/description.
  - Single section: “No Fleet Data Connected” with copy explaining that a `fleet` table or external TMS/API is expected later.

Future expectations:

- A `fleet`‑like data source (table or API) that can provide:
  - Asset counts by mode (road/sea/air).
  - Capacity/utilization metrics.
  - Maintenance, incidents, compliance, etc.

No contracts are enforced yet; this page is intentionally open‑ended.

### Reports (`app/reports/page.tsx`)

Current state:

- Pure shell:
  - One section “Report Library” with an empty‑state explaining no reports exist yet.

Future expectations:

- Once a reporting backend exists, this page should list report definitions/runs, likely from:
  - A `reports` table (metadata) and `report_runs` table (history), or
  - An external BI/reporting service.

Again, no contracts enforced; this is a layout placeholder.

---

## Chat (future)

### Previous behaviour (now removed)

- `app/api/chat/route.ts` used:
  - TypeORM + `DataSource` configured via `DATABASE_URL`.
  - `ChatOpenAI` (LangChain) to:
    - Generate SQL against a Postgres `shipments` table, using a system prompt with schema details.
    - Execute the SQL.
    - Summarize results back to the user.
- `app/chat/page.tsx` managed chat sessions and messages in Supabase tables:
  - `chats` and `messages` tables (with fallback to localStorage).
  - It called `/api/chat` with `messages` history and displayed LLM answers and `sql_query` text.
- `components/ChatAgent.tsx` floated on top of any page, sending `{ question }` to `/api/chat`.

### Current behaviour (Phase 1)

- `app/api/chat/route.ts`:
  - Does **not** connect to any DB or model.
  - Always returns a fixed JSON:
    - `answer`: explanation that chat is disabled.
    - `sql_query: null`.
- `app/chat/page.tsx`:
  - All Supabase imports and logic are removed.
  - Sessions/messages are local‑state only.
  - Each send appends a canned assistant message stating that chat is a visual prototype.
- `components/ChatAgent.tsx`:
  - No network calls; it echoes a static “backend disabled” message.

### Future design guidance

When rebuilding chat on top of the **SQL Server + Supabase auth** stack:

- Keep the **same message shapes** where possible:
  - `{ id, role: 'user' | 'assistant', content, sql_query? }` for messages.
- Consider a pipeline like:
  1. Validate Supabase JWT → determine user/client context.
  2. Use an LLM (optional) to translate natural‑language questions into:
     - SQL Server stored procedure calls.
     - Or parameterised queries against views/tables.
  3. Execute against SQL Server, then summarize results back to the frontend.
  4. Persist chats/messages in **a dedicated Postgres schema** (Supabase) separate from operational data.

This document intentionally does not lock you to LangChain or a particular model, but preserves the previous **pattern**: “NL → SQL → summarize.”

---

## Auth and data architecture (proposed)

To align with your plan:

- **Supabase (local Docker)**
  - Use only for authentication and user/client mapping.
  - Tables might include:
    - `users` (standard Supabase auth).
    - `clients` (client metadata, including `CONCODE` or list of codes).
    - `user_clients` (many‑to‑many mapping between users and client codes).

- **SQL Server (existing company DB)**
  - The source of truth for operational and KPI data:
    - Tables / views like `TBL_CLIENT_KPI_DASHBOARD_PBI`.
    - Stored procedures encapsulating business logic and filtering, e.g.:
      ```sql
      SELECT *
      FROM TBL_CLIENT_KPI_DASHBOARD_PBI
      WHERE CONCODE = @ConCode
        AND DBO.CONVERTDATE_YYYYMMDD(DOCRECD) >= @FromDate;
      ```

- **Next.js API layer**
  - Authenticated routes (e.g. `GET /api/dashboard`):
    - Read Supabase JWT (user id).
    - Look up associated `CONCODE`(s) in Supabase.
    - Call appropriate SQL Server stored procedures with `CONCODE` + date range.
    - Convert SQL rows into the shipment shape expected by the frontend (including field names above).
  - `getShipments()` in `app/actions.ts` can be updated later to call this route instead of returning `[]`.

This separation keeps **auth** and **operational data** concerns clean while allowing you to reuse your SQL Server stored logic.

