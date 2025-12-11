# Task: Remove Watermark from Main Chart in Findings for Brand+ Users

## Objective

For **Brand+ (Premium) users**, the main visualization chart displayed in the **Findings section** of the Actions Report should be **watermark-free**. 

Currently, the watermark is visible in both:
- The Findings section (when viewing the report in the browser)
- The PDF export (even when the "hide watermarks" option is unchecked)

## Expected Behavior

**For Brand+ users:**
1. When the Actions Report is generated, the main chart (`.chart-container`) should be captured **without** the watermark
2. The captured image stored in `chartImage.dataUrl` should be watermark-free
3. When displayed in the Findings section, it should show **no watermark**
4. In PDF export:
   - If "show watermarks" is **enabled**: Watermarks should be **added** to all images (including the main chart) during export
   - If "show watermarks" is **disabled**: All images should remain watermark-free

**For Standard users:**
- Main chart should have watermark everywhere (Findings and export)
- Other charts get watermarks added in export

## Current Problem

The watermark is still visible in:
- ✅ Findings section (should be watermark-free for Brand+)
- ✅ PDF export (even with "hide watermarks" unchecked)

## Relevant Code Locations

### 1. Chart Capture Logic
**File:** `src/components/reporting/components/ActionsReport/imageCapture/chartImageCapture.ts`

- **Function:** `captureChartAsImage()` (line ~73)
  - Accepts `options?: { hideWatermark?: boolean }`
  - Should hide watermark in original element before cloning (line ~259-280)
  - Should remove watermark from clone (line ~604-680)
  - Should restore watermark in original after capture (finally block ~1055)

- **Function:** `captureMultipleCharts()` (line ~1007)
  - Accepts `options?: { hideWatermarkForMainChart?: boolean }`
  - Should detect main chart and pass `hideWatermark: true` to `captureChartAsImage()`

### 2. Report Generation
**File:** `src/components/reporting/components/ActionsReport/ActionPlanGenerator.ts`

- **Function:** `generateActionPlan()` (line ~40)
  - Accepts `isPremium: boolean` parameter (line 52)
  - Calls `captureMultipleCharts()` with `hideWatermarkForMainChart: isPremium` (line ~254)

**File:** `src/components/reporting/utils/actionsReportGenerator.ts`

- **Function:** `generateActionsReport()` (line ~11)
  - Accepts `isPremium: boolean` parameter (line 19)
  - Passes `isPremium` to `generateActionPlan()` (line 89)

### 3. PDF Export
**File:** `src/components/reporting/components/ActionsReport/export/actionPlanExporter.ts`

- **Function:** `exportActionPlanToPDF()` (line ~926)
  - Should add watermarks to ALL images (including main chart) if `showWatermarks` is true (line ~1073-1087)
  - Currently has logic that treats main chart differently - this was updated but may need verification

### 4. UI Component
**File:** `src/components/reporting/components/ActionsReport/index.tsx`

- **Component:** `ActionsReport` (line ~23)
  - Receives `isPremium` prop (line 29)
  - Passes `isPremium` to `handleCaptureChart()` for manual captures (line ~307)

## Debug Logs

Check the browser console logs in: **`Temp file Sharing with Cursor/test watermark.log`**

Look for these messages (they should appear but currently don't):
- `🚨🚨🚨 captureMultipleCharts CALLED`
- `🚨🚨🚨 captureChartAsImage CALLED`
- `🔍 BEFORE CLONE - found X watermark layers`
- `🔍🔍🔍 WATERMARK CHECK`
- `🚫 REMOVING WATERMARK`
- `📸 Starting chart capture for X charts`

**Current Status:** None of these debug messages appear in the log, suggesting either:
1. The build hasn't refreshed with the new code
2. The code path isn't being executed
3. The charts are being captured via a different mechanism

## Key Implementation Details

1. **Watermark Location:** The watermark is rendered inside `.chart-container` as a `<div className="watermark-layer">` (see `src/components/visualization/components/ChartContainer.tsx` line ~235)

2. **Detection Logic:** Main chart is detected by checking if selector includes `'chart-container'` or equals `'.chart-container'`

3. **Removal Strategy:** 
   - Hide watermark in original element BEFORE cloning (so clone doesn't include it)
   - Store original styles to restore after capture
   - Remove from clone as well (defensive)

4. **Premium Check:** `isPremium` is determined from `activeEffects.has('premium')` in `ReportingSection.tsx` (line ~137)

## Testing Steps

1. Ensure Brand+ mode is active (check console for `isPremium result: true`)
2. Generate/Regenerate Actions Report
3. Check browser console for debug messages
4. Verify main chart in Findings section has no watermark
5. Export to PDF with "hide watermarks" unchecked - should have watermarks on all images
6. Export to PDF with "hide watermarks" checked - should have no watermarks on any images

## Notes

- The log file shows `isPremium: true` is being passed correctly
- The log shows `actionPlanSupportingImages: 5` meaning charts were captured
- But NO debug messages from our capture functions appear, suggesting the code isn't running or build hasn't refreshed
- All code changes have been made but may not be in the compiled bundle yet





