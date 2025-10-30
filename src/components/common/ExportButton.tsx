import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type ExportFormat = 'png' | 'pdf';

interface ExportButtonProps {
  targetSelector: string; // CSS selector for the element to capture
  label?: string;
  padding?: number; // extra padding around target (export-time only)
  background?: string; // wrapper background color
  iconOnly?: boolean;
  icon?: React.ReactNode;
  buttonStyle?: React.CSSProperties; // allow host to harmonize with surrounding controls
  onOpenOptions?: () => void; // if provided, clicking opens host contextual panel instead of local popover
  buttonClassName?: string; // allow host to match exact button class
}

export const ExportButton: React.FC<ExportButtonProps> = ({ targetSelector, label = 'Export', padding = 92, background = '#ffffff', iconOnly = false, icon, buttonStyle, onOpenOptions, buttonClassName }) => {
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<ExportFormat>('png');
  const scale = 2; // fixed crisp default
  const [busy, setBusy] = React.useState<boolean>(false);

  const toggle = () => setOpen(v => !v);

  const runExport = async () => {
    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (!el || busy) return;
    setBusy(true);
    // Hoisted references for cleanup in finally
    let wrapper: HTMLDivElement | null = null;
    let clone: HTMLElement | null = null;
    try {
      // Ensure web fonts are ready
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }

      // Offscreen clone approach to avoid layout/clipping issues
      const rect = el.getBoundingClientRect();
      wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-10000px';
      wrapper.style.top = '0';
      wrapper.style.zIndex = '-1';
      wrapper.style.padding = `${Math.max(0, padding)}px`;
      wrapper.style.background = background;
      wrapper.style.borderRadius = '8px';
      wrapper.style.boxSizing = 'border-box';

      clone = el.cloneNode(true) as HTMLElement;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.boxSizing = 'border-box';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const backgroundColor = getComputedStyle(wrapper).backgroundColor || background;
      const canvas = await html2canvas(wrapper, {
        scale,
        backgroundColor,
        useCORS: true
      });

      if (format === 'png') {
        canvas.toBlob(blob => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const d = new Date();
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const HH = String(d.getHours()).padStart(2, '0');
          const MM = String(d.getMinutes()).padStart(2, '0');
          const timestamp = `${dd}-${mm}-${yyyy}-${HH}-${MM}`;
          link.href = url;
          link.download = `segmentor-app_main_chart_${timestamp}.png`;
          link.click();
          URL.revokeObjectURL(url);
        });
      } else {
        const imgData = canvas.toDataURL('image/png');
        // Create a PDF sized to the image in points (1 pt = 1/72 inch)
        const pxWidth = canvas.width;
        const pxHeight = canvas.height;
        const ptWidth = pxWidth * 0.75; // 96 dpi -> 72 dpi
        const ptHeight = pxHeight * 0.75;
        const pdf = new jsPDF({ orientation: ptWidth > ptHeight ? 'l' : 'p', unit: 'pt', format: [ptWidth, ptHeight] });
        pdf.addImage(imgData, 'PNG', 0, 0, ptWidth, ptHeight);
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const HH = String(d.getHours()).padStart(2, '0');
        const MM = String(d.getMinutes()).padStart(2, '0');
        const timestamp = `${dd}-${mm}-${yyyy}-${HH}-${MM}`;
        pdf.save(`segmentor-app_main_chart_${timestamp}.pdf`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', err);
      alert('Export failed. If a watermark/logo is remote, ensure CORS is enabled or host the asset locally.');
    } finally {
      // Cleanup offscreen elements
      if (wrapper && document.body.contains(wrapper)) {
        wrapper.remove();
      }
      clone = null;
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => {
          if (onOpenOptions) {
            onOpenOptions();
            return;
          }
          toggle();
        }}
        disabled={busy}
        className={buttonClassName || 'report-button'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} options`}
        title={`${label} options`}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...buttonStyle }}
      >
        {busy ? 'Exporting…' : (iconOnly ? (icon || '⬇') : `${label}`)}
      </button>
      {(!onOpenOptions && open) && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 6,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            padding: 10,
            minWidth: 220,
            zIndex: 5000
          }}
        >
          {/* Title removed to avoid duplicate headings in contextual panel usage */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name="format"
                checked={format === 'png'}
                onChange={() => setFormat('png')}
                style={{ accentColor: '#3a863e' }}
              />
              PNG (recommended)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name="format"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                style={{ accentColor: '#3a863e' }}
              />
              PDF (image)
            </label>


            <button
              onClick={runExport}
              className="report-button"
              disabled={busy}
              style={{
                marginTop: 6,
                background: 'white',
                border: '1px solid #d1d5db',
                color: '#6b7280',
                padding: '6px 12px',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              {busy ? 'Exporting…' : `Export as ${format.toUpperCase()} (2x)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;


