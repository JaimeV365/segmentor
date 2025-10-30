import { DataPoint } from '@/types/base';

export function exportCsv(options: {
  data: DataPoint[];
  computeSegment: (p: DataPoint) => string;
  filename?: string;
}) {
  const { data, computeSegment, filename = defaultFilename() } = options;
  if (!Array.isArray(data) || data.length === 0) return;

  // Collect all keys across the dataset to preserve additional fields
  const fieldSet = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach(k => fieldSet.add(k));
  }

  // Ensure common fields first
  const preferredOrder = ['id', 'name', 'email', 'group', 'date', 'dateFormat', 'satisfaction', 'loyalty'];
  const remaining = Array.from(fieldSet).filter(k => !preferredOrder.includes(k));
  const headers = [...preferredOrder, ...remaining, 'segment'];

  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(','));

  for (const row of data) {
    const segment = computeSegment(row);
    const values = headers.map(h => {
      if (h === 'segment') return csvEscape(segment);
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


