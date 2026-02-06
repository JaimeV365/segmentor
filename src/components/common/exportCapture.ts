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
  
  // Convert canvas elements to images for better html2canvas compatibility
  // Canvas elements with complex strokes (like inner rings) can render incorrectly in html2canvas
  // We need to get the original canvas from the DOM (not the clone) to get the actual rendered content
  const originalCanvasElements = el.querySelectorAll('canvas.canvas-data-points') as NodeListOf<HTMLCanvasElement>;
  const clonedCanvasElements = clone.querySelectorAll('canvas.canvas-data-points') as NodeListOf<HTMLCanvasElement>;
  
  console.log('🔍 Export: Found', originalCanvasElements.length, 'canvas elements');
  
  originalCanvasElements.forEach((originalCanvas, index) => {
    const clonedCanvas = clonedCanvasElements[index];
    if (!clonedCanvas || !originalCanvas) return;
    
    try {
      // Get the rendered content from the original canvas
      const dataUrl = originalCanvas.toDataURL('image/png', 1.0);
      console.log('✅ Export: Converted canvas to image, size:', dataUrl.length);
      
      // Convert cloned canvas to image
      const img = document.createElement('img');
      img.src = dataUrl;
      
      // Copy positioning styles from canvas
      const computedStyle = window.getComputedStyle(originalCanvas);
      img.style.width = computedStyle.width || `${originalCanvas.width}px`;
      img.style.height = computedStyle.height || `${originalCanvas.height}px`;
      img.style.position = computedStyle.position || 'absolute';
      img.style.left = computedStyle.left || '0';
      img.style.top = computedStyle.top || '0';
      img.style.pointerEvents = 'none';
      img.style.zIndex = computedStyle.zIndex || 'auto';
      
      // Replace cloned canvas with image
      const parent = clonedCanvas.parentElement;
      if (parent) {
        parent.insertBefore(img, clonedCanvas);
        clonedCanvas.remove();
        console.log('✅ Export: Replaced canvas with image');
      }
    } catch (err) {
      console.warn('❌ Export: Failed to convert canvas to image:', err);
    }
  });
  
  // Fix data point inner rings for export (convert inset box-shadow to nested divs for better html2canvas compatibility)
  // Also remove outer box-shadows that create black shadow artifacts
  const dataPoints = clone.querySelectorAll('.data-point') as NodeListOf<HTMLElement>;
  console.log('🔍 Export: Found', dataPoints.length, 'data points');
  
  dataPoints.forEach((point, index) => {
    // Get computed style from ORIGINAL element (not clone) to see actual box-shadow
    // Find the corresponding original point
    const originalPoints = el.querySelectorAll('.data-point') as NodeListOf<HTMLElement>;
    const originalPoint = originalPoints[index];
    
    // Get size from original or clone
    const inlineWidth = point.style.width;
    const size = parseFloat(inlineWidth) || (originalPoint ? parseFloat(window.getComputedStyle(originalPoint).width) : parseFloat(window.getComputedStyle(point).width)) || 0;
    
    // Get the computed box-shadow from the ORIGINAL element to see what we need to convert
    // But we'll remove ALL box-shadows from the CLONE and rebuild only what we need
    const originalBoxShadow = originalPoint ? window.getComputedStyle(originalPoint).boxShadow : '';
    
    // ALWAYS remove all box-shadows from the clone first (CSS class adds box-shadow: 0 1px 3px rgba(0,0,0,0.2))
    // Use !important to override CSS class box-shadow
    point.style.setProperty('box-shadow', 'none', 'important');
    
    // Also remove any outline that might create a black circle
    point.style.setProperty('outline', 'none', 'important');
    
    // Now check the original's box-shadow to see if it has an inset shadow (inner ring) we need to convert
    let boxShadow = originalBoxShadow;
    
    console.log(`🔍 Export: Point ${index}, boxShadow:`, boxShadow, 'size:', size);
    
    // Check if it's an inset box-shadow (inner ring)
    // Box-shadow format in browser: "rgba(0, 0, 0, 0.3) 0px 0px 0px 16.52px inset"
    if (boxShadow && boxShadow.includes('inset')) {
      // Match format: "rgba(...) 0px 0px 0px Xpx inset" or "rgba(...) 0 0 0 Xpx inset"
      const insetMatch = boxShadow.match(/(rgba?\([^)]+\))\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s+inset/);
      if (insetMatch) {
        const ringColor = insetMatch[1];
        const ringWidth = parseFloat(insetMatch[2]);
        
        // Calculate inner circle size so the border stays INSIDE the dot
        // The inset box-shadow creates a ring that's ringWidth pixels from the edge
        // So the ring extends from radius (size/2 - ringWidth) to radius (size/2)
        // When we use a border with box-sizing: content-box, the border is added OUTSIDE the element's size
        // So if inner div has size D and border B, total size = D + 2*B
        // We want total size <= size (dot size), so: D + 2*B <= size
        // Therefore: D <= size - 2*B
        // To match the inset box-shadow exactly, we want the border outer edge at size/2
        // So: D/2 + B = size/2, therefore D = size - 2*B
        const innerCircleSize = Math.max(0, size - ringWidth * 2);
        
        console.log(`✅ Export: Converting point ${index}, ringWidth:`, ringWidth, 'innerCircleSize:', innerCircleSize, 'dot size:', size);
        
        if (innerCircleSize > 0 && ringWidth > 0) {
          // Remove ALL box-shadows (inset and outer shadows) that might create artifacts in html2canvas
          // The CSS has box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) which creates the black shadow
          // Use !important to override CSS class
          point.style.setProperty('box-shadow', 'none', 'important');
          
          // Add flex display to center the inner ring
          point.style.display = 'flex';
          point.style.alignItems = 'center';
          point.style.justifyContent = 'center';
          
          // Create nested div for inner ring
          // Use content-box so border is added outside, matching the inset box-shadow behavior
          const innerRing = document.createElement('div');
          innerRing.style.width = `${innerCircleSize}px`;
          innerRing.style.height = `${innerCircleSize}px`;
          innerRing.style.borderRadius = '50%';
          innerRing.style.border = `${ringWidth}px solid ${ringColor}`;
          innerRing.style.boxSizing = 'content-box'; // Border added outside, not included in size
          innerRing.style.pointerEvents = 'none';
          innerRing.style.flexShrink = '0';
          innerRing.style.boxShadow = 'none'; // Ensure no shadow on inner ring
          innerRing.style.margin = '0'; // No margin
          innerRing.style.padding = '0'; // No padding
          
          point.appendChild(innerRing);
          const actualOuterRadius = (innerCircleSize + ringWidth * 2) / 2;
          console.log(`✅ Export: Added inner ring to point ${index}, innerCircleSize:`, innerCircleSize, 'ringWidth:', ringWidth, 'total size:', innerCircleSize + ringWidth * 2, 'dot size:', size, 'actual outer radius:', actualOuterRadius, 'dot radius:', size/2);
        } else {
          // Even if no inner ring, remove outer box-shadow to prevent black shadow artifacts
          point.style.setProperty('box-shadow', 'none', 'important');
        }
      } else {
        console.warn(`⚠️ Export: Could not parse box-shadow for point ${index}:`, boxShadow);
      }
    }
  });
  
  // Fix watermark in clone for html2canvas compatibility
  // The issue: html2canvas struggles with CSS transform: rotate() + objectFit: contain
  // Solution: Replace the rotated img with a pre-rotated canvas element
  const watermarkLayers = clone.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
  const originalWatermarkLayers = el.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
  
  for (let index = 0; index < watermarkLayers.length; index++) {
    const layer = watermarkLayers[index];
    const img = layer.querySelector('img') as HTMLImageElement;
    const originalLayer = originalWatermarkLayers[index];
    const originalImg = originalLayer?.querySelector('img') as HTMLImageElement;
    
    if (img && originalImg) {
      // Check the original's inline style for rotation
      const inlineTransform = originalImg.style.transform || '';
      const isRotated = inlineTransform.includes('rotate(-90deg)');
      
      // Get container and image dimensions
      const containerW = parseFloat(layer.style.width) || 90;
      const containerH = parseFloat(layer.style.height) || 90;
      const opacity = parseFloat(window.getComputedStyle(originalLayer).opacity) || 0.6;
      
      console.log(`🔍 Export: Watermark ${index} - transform="${inlineTransform}", isRotated=${isRotated}, container=${containerW}x${containerH}`);
      
      if (isRotated && originalImg.complete && originalImg.naturalWidth > 0) {
        // Create a canvas with the pre-rotated image
        const canvas = document.createElement('canvas');
        // After -90deg rotation: width becomes height, height becomes width
        canvas.width = containerH;  // Visual width after rotation = original height
        canvas.height = containerW; // Visual height after rotation = original width
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Calculate image size to fit in container while preserving aspect ratio
          const imgAspect = originalImg.naturalWidth / originalImg.naturalHeight;
          // For -90deg rotation, we're fitting into a tall narrow space
          // containerH (now canvas width) x containerW (now canvas height)
          let drawW, drawH;
          if (imgAspect > containerH / containerW) {
            // Image is wider than container - fit to width
            drawW = containerH;
            drawH = containerH / imgAspect;
          } else {
            // Image is taller than container - fit to height
            drawH = containerW;
            drawW = containerW * imgAspect;
          }
          
          // Center and rotate
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(originalImg, -drawW / 2, -drawH / 2, drawW, drawH);
          
          // Replace img with canvas
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block';
          img.replaceWith(canvas);
          
          // Update container to match visual dimensions
          layer.style.width = `${containerH}px`;
          layer.style.height = `${containerW}px`;
          layer.style.opacity = String(opacity);
          
          console.log(`🔧 Export: Replaced rotated img with pre-rotated canvas ${canvas.width}x${canvas.height}`);
        }
      } else {
        // Flat mode or image not loaded - just ensure proper sizing
        img.style.objectFit = 'contain';
        console.log(`🔧 Export: Flat watermark, objectFit=contain`);
      }
    }
  }
  console.log('🔍 Export: Processed', watermarkLayers.length, 'watermark layers');
  
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    console.log('🖼️ Starting html2canvas capture...');
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: background, useCORS: true });
    console.log('✅ Canvas created:', canvas.width, 'x', canvas.height);
    
    // Watermark is now rendered by html2canvas (with rotation fix applied to clone)
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

