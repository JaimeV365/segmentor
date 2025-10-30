import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type ExportFormat = 'png' | 'pdf';

export async function exportCapture(options: {
  targetSelector: string;
  format: ExportFormat;
  padding?: number;
  background?: string;
}) {
  const { targetSelector, format, padding = 92, background = '#ffffff' } = options;
  const el = document.querySelector(targetSelector) as HTMLElement | null;
  if (!el) return;
  if ((document as any).fonts?.ready) {
    await (document as any).fonts.ready;
  }
  const rect = el.getBoundingClientRect();
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  // Asymmetric padding to favor left and bottom (for axis legends)
  const padTop = Math.max(12, Math.round(padding / 3));
  const padRight = Math.max(24, Math.round(padding / 2));
  const padBottom = Math.max(padding + 30, Math.round(padding + 30));
  const padLeft = Math.max(padding + 60, Math.round(padding + 60));
  wrapper.style.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;
  wrapper.style.background = background;
  wrapper.style.borderRadius = '8px';
  wrapper.style.boxSizing = 'border-box';
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: background, useCORS: true });

    // Overlay controlled watermark with fixed size/position to ensure consistent appearance
    try {
      const logoUrl = '/segmentor-logo.png';
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = logoUrl;
      });
      const ctx = canvas.getContext('2d');
      if (ctx && img.width && img.height) {
        const margin = Math.max(24, Math.round(canvas.width * 0.02));
        const targetHeight = 90; // fixed height for predictability
        const aspect = img.width / img.height || 1;
        const targetWidth = Math.round(targetHeight * aspect);
        const x = canvas.width - targetWidth - margin;
        const y = canvas.height - targetHeight - margin;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, x, y, targetWidth, targetHeight);
        ctx.restore();
      }
    } catch {}
    if (format === 'png') {
      return new Promise<void>((resolve) => {
        canvas.toBlob(blob => {
          if (!blob) return resolve();
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
          resolve();
        });
      });
    } else {
      const imgData = canvas.toDataURL('image/png');
      const pxWidth = canvas.width;
      const pxHeight = canvas.height;
      const ptWidth = pxWidth * 0.75;
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
  } finally {
    wrapper.remove();
  }
}


