# Troubleshooting FAQ

## My CSV file isn't uploading correctly. What's wrong?
**Keywords:** CSV error, upload problem, file format error, validation error

Common CSV issues:

- **Missing headers:** Ensure your first row contains column names (Satisfaction, Loyalty, etc.)
- **Wrong column names:** Column names must match exactly (case-sensitive)
- **Invalid scores:** Satisfaction and loyalty values must be numbers within your scale range
- **Encoding issues:** Save your CSV as UTF-8 encoding
- **Empty rows:** Remove any completely empty rows

The tool will show specific error messages indicating which rows have problems and how to fix them.

## What browsers are supported?
**Keywords:** browser support, compatibility, which browser

The tool works best with modern browsers:

- **Chrome** 60 or later
- **Firefox** 55 or later
- **Safari** 12 or later
- **Edge** 79 or later

For the best experience, use the latest version of your browser. Older browsers may have limited functionality.

## Can I use the tool on mobile devices?
**Keywords:** mobile, tablet, phone, responsive

Yes! The tool is fully responsive and works on mobile devices and tablets. All features are available, though some may be optimised for touch interaction on smaller screens.

## The tool seems slow with large datasets. Is this normal?
**Keywords:** performance, slow, large data, many customers

The tool processes everything locally in your browser, so performance depends on your device. For datasets with thousands of entries, you may notice:

- Slightly slower chart rendering
- Brief delays when applying filters
- Longer report generation times

This is normal for local processing. If performance becomes an issue, try filtering your data to a smaller subset for analysis.

## Why do I see a demo mode limitation?
**Keywords:** demo limit, 100 entries, demo mode

Demo mode is limited to 100 customer entries to showcase the tool's capabilities. To remove this limitation, exit demo mode and use the full tool with your own data. There's no limit on the number of entries in the standard tool.

## My project file won't load. What should I do?
**Keywords:** load error, .seg file, project file error

If your .seg file won't load:

- **Check file format:** Ensure it's a valid .seg file exported from Segmentor
- **File size:** Very large files may take longer to load
- **Browser storage:** Clear your browser's local storage if you're experiencing issues
- **Try a different browser:** Some browsers handle file loading differently

If problems persist, try exporting your data as CSV as a backup.

## Why are some features greyed out or unavailable?
**Keywords:** disabled features, unavailable, greyed out

Some features may be temporarily unavailable if:

- You're in demo mode (some advanced features are limited)
- Your data doesn't meet certain requirements (e.g., Near-Advocates requires sufficient data spread)
- The feature requires specific data attributes (e.g., date filtering requires date columns)

Check the tooltips or help text for specific requirements.

## The chart looks different after I reload. Why?
**Keywords:** chart changed, reload, settings lost

If you haven't saved your project, custom settings like midpoint position, zone sizes, and manual reassignments are stored in your browser's temporary storage. These may be cleared if:

- You clear your browser cache
- You use a different browser or device
- Your browser's storage quota is exceeded

Always save your project using the Save button to preserve all settings.

## Can I use the tool without an internet connection?
**Keywords:** offline, no internet, work offline

Yes! Once the page has loaded, you can work completely offline. All processing happens in your browser, so no internet connection is required after the initial page load.

## Why does segmentor.app use a .app domain instead of .com?
**Keywords:** domain, .app, why .app, domain choice

We were quoted £18,000 by domain speculators for the .com version, but we chose an .app domain for £6 and invested the difference in improving our service instead.

The .app domain also clearly signals that Segmentor is an application—a tool you use, not just a website you visit. This aligns perfectly with our tool-first approach.

