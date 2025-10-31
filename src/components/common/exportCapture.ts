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
  console.log('🔍 exportCapture called with selector:', targetSelector);
  const el = document.querySelector(targetSelector) as HTMLElement | null;
  if (!el) {
    console.error('❌ Element not found for selector:', targetSelector);
    const visualizationSection = document.querySelector('.visualization-section');
    const visualisationSection = document.querySelector('.visualisation-section');
    console.error('❌ Checked alternatives:', {
      'visualization-section (with z)': !!visualizationSection,
      'visualisation-section (with s)': !!visualisationSection,
      'any .section': document.querySelectorAll('.section').length
    });
    throw new Error(`Export target element not found: ${targetSelector}`);
  }
  console.log('✅ Element found:', el.className, el.offsetWidth, 'x', el.offsetHeight);
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
  const padBottom = Math.max(padding - 20, Math.round(padding - 20)); // Reduced by 50 total from original (padding + 30 -> padding -> padding - 20)
  const padLeft = Math.max(padding + 10, Math.round(padding + 10)); // Reduced by 50 total from original (padding + 60 -> padding + 30 -> padding + 10)
  wrapper.style.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;
  wrapper.style.background = background;
  wrapper.style.borderRadius = '8px';
  wrapper.style.boxSizing = 'border-box';
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  
  // Fix watermark dimensions in the clone for export only (vertical mode needs wider container)
  // This doesn't affect the visualization, only the export
  const watermarkLayers = clone.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
  watermarkLayers.forEach(layer => {
    const currentTransform = layer.style.transform || getComputedStyle(layer).transform;
    const isVertical = currentTransform.includes('rotate(-90deg)') || currentTransform.includes('-90deg');
    
    if (isVertical) {
      // Apply the same dimensions we discovered work for vertical mode
      const currentWidth = parseFloat(layer.style.width || '90') || 90;
      const logoSize = currentWidth; // Original square container size
      const verticalScale = 0.4; // Reduced to 0.4 (40% of original)
      const containerWidth = logoSize * 2.8 * verticalScale;
      const containerHeight = logoSize * 0.4 * verticalScale;
      
      // Update dimensions
      layer.style.width = `${containerWidth}px`;
      layer.style.height = `${containerHeight}px`;
      layer.style.transformOrigin = 'center center';
      
      // Adjust position to keep visual center in the same place after changing container dimensions
      // Original: square container (logoSize x logoSize) at position (currentLeft, currentTop)
      //   Center is at: (currentLeft + logoSize/2, currentTop + logoSize/2)
      // New: rectangular container (containerWidth x containerHeight)
      //   We want center at same place: (currentLeft + logoSize/2, currentTop + logoSize/2)
      //   So new position should be: (centerX - containerWidth/2, centerY - containerHeight/2)
      
      const currentLeft = parseFloat(layer.style.left || '0') || 0;
      const currentTop = parseFloat(layer.style.top || '0') || 0;
      
      // Calculate original center position
      const originalCenterX = currentLeft + logoSize / 2;
      const originalCenterY = currentTop + logoSize / 2;
      
      // Position new container so its center matches original center
      const adjustedLeft = originalCenterX - containerWidth / 2;
      const adjustedTop = originalCenterY - containerHeight / 2;
      
      // Additional offset to move logo to the right in exports
      const rightOffset = 40; // Pixels to move right
      layer.style.left = `${adjustedLeft + rightOffset}px`;
      layer.style.top = `${adjustedTop}px`;
    }
  });
  
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    console.log('🖼️ Starting html2canvas capture...');
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: background, useCORS: true });
    console.log('✅ Canvas created:', canvas.width, 'x', canvas.height);
    if (format === 'png') {
      console.log('📦 Converting canvas to blob...');
      return new Promise<void>((resolve) => {
        canvas.toBlob(blob => {
          if (!blob) {
            console.error('❌ Failed to create blob from canvas');
            return resolve();
          }
          console.log('✅ Blob created, size:', blob.size, 'bytes');
          const url = URL.createObjectURL(blob);
          console.log('✅ Object URL created:', url.substring(0, 50) + '...');
          const link = document.createElement('a');
          const d = new Date();
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const HH = String(d.getHours()).padStart(2, '0');
          const MM = String(d.getMinutes()).padStart(2, '0');
          const timestamp = `${dd}-${mm}-${yyyy}-${HH}-${MM}`;
          const filename = `segmentor-app_main_chart_${timestamp}.png`;
          link.href = url;
          link.download = filename;
          console.log('🔗 Link created, download attribute:', filename);
          document.body.appendChild(link);
          console.log('✅ Link appended to DOM, clicking...');
          link.click();
          console.log('✅ link.click() called');
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
            console.log('✅ Cleanup complete, download should have started');
            resolve();
          }, 500);
        }, 'image/png');
      });
    } else {
      console.log('📄 Creating PDF...');
      const imgData = canvas.toDataURL('image/png');
      console.log('✅ Image data URL created, length:', imgData.length);
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
      const filename = `segmentor-app_main_chart_${timestamp}.pdf`;
      console.log('💾 Calling pdf.save():', filename);
      pdf.save(filename);
      console.log('✅ pdf.save() called - check downloads folder');
    }
  } catch (error) {
    console.error('❌ Export error:', error);
    throw error;
  } finally {
    wrapper.remove();
  }
}

