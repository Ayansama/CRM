# GrowEasy CRM CSV Importer — Build & Resolution Log

This document records the major errors encountered during setup, compilation, and integration, along with their corresponding root causes and solutions.

---

## 1. PNPM Workspace Dependency Approval Error
* **Error Message:** `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@..., sharp@...`
* **Root Cause:** In modern `pnpm` versions (v10+), configuration parameters such as `onlyBuiltDependencies` are no longer parsed from the root `package.json`'s `"pnpm"` object; they must reside inside `pnpm-workspace.yaml`.
* **Solution:** 
  * Removed the `"pnpm"` field from root `package.json`.
  * Added the configuration key to `pnpm-workspace.yaml`:
    ```yaml
    onlyBuiltDependencies:
      - esbuild
      - sharp
    ```
  * Ran `pnpm approve-builds` to authorize the execution of native build scripts.

## 2. API Server Crash on Database Migration Failures
* **Error Message:** `Failed to run database migrations: error: relation "column_mappings" does not exist ... process.exit(1)`
* **Root Cause:** The database migration script threw an uncaught error if the database connection failed or table relations were missing, which subsequently triggered `process.exit(1)` inside the main server boot sequence. This blocked testing and stateless mode running.
* **Solution:**
  * Wrapped the database migration step in [migrate.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/db/migrate.ts) in a `try/catch` block that logs a warning instead of re-throwing.
  * Removed `process.exit(1)` from `startServer` in [index.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/index.ts) to guarantee the API boots successfully in reduced stateless mode if Neon PostgreSQL database credentials are absent or disconnected.

## 3. Express 5 CORS Wildcard Route Crash
* **Error Message:** `TypeError: Missing parameter name at index 1: *; visit https://git.new/pathToRegexpError`
* **Root Cause:** Express v5 uses `path-to-regexp` v8 for routing matching, which no longer accepts bare `*` wildcard routes. Using `app.options('*', ...)` caused a runtime initialization crash.
* **Solution:**
  * Updated [index.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/index.ts) to use the Express 5 compatible named wildcard format:
    ```typescript
    app.options('/{*path}', cors());
    ```

## 4. Google Generative AI SDK Version Compatibility
* **Error Message:** `TypeError: Cannot read properties of undefined (reading 'OBJECT')`
* **Root Cause:** The `Type` schema enum was referenced in `geminiClient.ts` (e.g., `Type.OBJECT`), but the installed `@google/generative-ai` SDK version (v0.14.x) does not export this enum (it was introduced in v0.21+).
* **Solution:**
  * Rewrote [geminiClient.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/services/ai/geminiClient.ts) schema structures to use standard uppercase string literals (e.g. `"OBJECT"`, `"ARRAY"`, `"STRING"`, `"NUMBER"`, `"INTEGER"`) instead of relying on the SDK's `Type` enum object.

## 5. CSV Parser Failure with UTF-8 BOM
* **Error Message:** `Invalid Opening Quote: a quote is found on field 0 at line 1, value is ""`
* **Root Cause:** Real-world CSV files exported from Excel typically contain a hidden Byte Order Mark (BOM) sequence (`\uFEFF`) at the beginning of the file. The `csv-parse` library saw this sequence as an unescaped stray quote, causing it to crash during upload.
* **Solution:**
  * Configured `csv-parse` in [parser.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/services/csv/parser.ts) with `bom: true` to strip the UTF-8 BOM automatically, and added `relax_quotes: true` + `relax_column_count: true` for additional parsing resilience.

## 6. Gemini Schema Validation Rejects Empty Enums
* **Error Message:** `GenerateContentRequest.generation_config.response_schema.properties[records].items.properties[data_source].enum[5]: cannot be empty`
* **Root Cause:** The Gemini API's JSON schema validation engine does not allow empty string values (`""`) inside `enum` option arrays.
* **Solution:**
  * Modified [geminiClient.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/services/ai/geminiClient.ts) to remove `""` from the enums of `crm_status` and `data_source`.
  * Removed `crm_status` and `data_source` from the `required` properties array in the Gemini schema, allowing them to be omitted by the model.
  * Relied on [validation.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/services/ai/validation.ts)'s Zod parsing schema, which automatically defaults omitted values to `""`.
## 7. Recharts Line Chart Rendering & Alignment Issue
* **Error Message:** Line chart not rendering data points; lines hovered at 0; X-axis ticks misaligned.
* **Root Cause:**
  * **Incorrect Axis Type:** The `XAxis` used `dataKey="hour"` with values `0-23` without specifying `type="number"`. Recharts treated it as a category axis, misaligning numeric ticks.
  * **Historical Data vs Today's Window:** The backend's `activityTrend` was bucketing records into a 24-hour window *for today*. Since the imported CSV leads had historical `created_at` dates, they fell outside of today, leaving all buckets at `0`.
  * **Height Mismatch:** The chart card height was set independently of the adjacent Status Analytics donut chart card, causing visual imbalance.
* **Solution:**
  * **Backend Refactor:** Modified `getAnalytics` in [importStore.ts](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/api/src/services/importStore.ts) to aggregate data into a **7-day daily trend** (bucketed by date string with short weekday labels like "Mon", "Tue") instead of hourly intervals for today.
  * **Frontend Refactor:** Updated [ActivityTrendChart.tsx](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/web/components/dashboard/ActivityTrendChart.tsx) to render a standard category axis matching the new 7-day labels, added visible data point dots (`dot={{ r: 3 }}`), and enabled flexbox container scaling.
  * **Layout Alignment:** Fixed the wrapper container inside [page.tsx](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/web/app/dashboard/page.tsx) to `h-[380px]` to perfectly match the adjacent donut card height.

## 8. QuickStats Incorrectly Filtering on Search
* **Error Message:** Typing in the search bar incorrectly filtered the QuickStats summary cards above the leads table, causing total counts to reflect the search results rather than the overall loaded dataset.
* **Root Cause:** The `useMemo` hook responsible for calculating QuickStats metrics (Total, Good, Pending, and Conversion Rate) had a dependency on `filteredLeads` instead of the unfiltered `leads` array.
* **Solution:** 
  * Updated [page.tsx](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/web/app/leads/page.tsx) to depend on and iterate over the `leads` state rather than `filteredLeads` when computing `stats`. This decouples the table's visual search filter from the global metrics calculation.

## 9. AppShell Background Not Switching in Dark Mode
* **Error Message:** When toggling Dark Mode, the main page background remained a light gray (`#f0f2f5`) while the cards and tables correctly switched to dark themes.
* **Root Cause:** The `AppShell` component layout had a hardcoded background color (`bg-[#f0f2f5]`) that lacked a `dark:` variant, preventing it from adapting to the active theme.
* **Solution:** 
  * Updated [AppShell.tsx](file:///c:/Users/kamis/OneDrive/Desktop/importer/apps/web/components/layout/AppShell.tsx) to include the `dark:bg-background` Tailwind class, allowing the layout background to automatically switch to the correct dark mode color when the theme is toggled.
