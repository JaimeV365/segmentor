import { DataPoint } from '@/types/base';

export function exportCsv(options: {
  data: DataPoint[];
  computeSegment: (p: DataPoint) => string;
  filename?: string;
  allData?: DataPoint[]; // Optional: all unfiltered data to export
  filteredData?: DataPoint[]; // Optional: filtered data to determine "Filtered out" status
}) {
  const { data, computeSegment, filename = defaultFilename(), allData, filteredData } = options;
  
  // Use allData if provided, otherwise use data
  const dataToExport = allData && allData.length > 0 ? allData : data;
  if (!Array.isArray(dataToExport) || dataToExport.length === 0) return;

  // Create a Set of filtered data IDs for quick lookup
  const filteredIds = new Set<string>();
  if (filteredData && filteredData.length > 0) {
    filteredData.forEach(row => {
      if (row.id) filteredIds.add(row.id);
    });
  } else if (!allData) {
    // If allData wasn't provided, assume all rows in data are filtered (not filtered out)
    data.forEach(row => {
      if (row.id) filteredIds.add(row.id);
    });
  }

  // Collect all keys across the dataset to preserve additional fields
  const fieldSet = new Set<string>();
  for (const row of dataToExport) {
    Object.keys(row).forEach(k => fieldSet.add(k));
  }

  // Ensure common fields first, including "Filtered Out" if applicable
  const preferredOrder = ['id', 'name', 'email', 'group', 'date', 'dateFormat', 'satisfaction', 'loyalty'];
  const remaining = Array.from(fieldSet).filter(k => !preferredOrder.includes(k));
  
  // Add "Filtered Out" column before "segment" if we have filtering information
  const headers = [...preferredOrder, ...remaining];
  if (allData && filteredData) {
    headers.push('Filtered Out');
  }
  headers.push('segment');

  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(','));

  for (const row of dataToExport) {
    const segment = computeSegment(row);
    // If row ID is in filteredIds, it passes the filters (shown in chart = "No" for Filtered column)
    // If row ID is NOT in filteredIds, it's filtered out (hidden = "Yes" for Filtered column)
    const isFiltered = allData && filteredData ? !filteredIds.has(row.id) : false;
    const values = headers.map(h => {
      if (h === 'segment') return csvEscape(segment);
      if (h === 'Filtered Out') return csvEscape(isFiltered ? 'Yes' : 'No');
      const v = (row as any)[h];
      return csvEscape(v);
    });
    lines.push(values.join(','));
  }

  const csvContent = '\ufeff' + lines.join('\n'); // UTF-8 BOM for Excel and non-latin chars
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function defaultFilename(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `segmentor-app_raw_data_${dd}-${mm}-${yyyy}-${HH}-${MM}`;
}


