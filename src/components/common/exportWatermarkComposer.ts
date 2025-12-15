/**
 * Export-time watermark composer
 * 
 * Composes watermark onto export canvas with proper aspect ratio preservation.
 * This avoids DOM transform quirks by using native canvas drawing.
 */

interface WatermarkSettings {
  effects: Set<string>;
  chartContainerWidth: number;
  chartContainerHeight: number;
}

const DEFAULT_LOGO = '/segmentor-logo.png';
const XP_LOGO = 'https://xperience-360.com/wp-content/uploads/2024/12/New-Xperience-Logo-Black-loop-corrected-360-centered.png';
const TM_LOGO = 'https://cdn.prod.website-files.com/6667436f74d6166897e4686e/667ec77e501687a868dd9fe7_TeresaMonroe%20logo%20blanc.webp';

/**
 * Parses watermark settings from effects set
 */
function parseWatermarkSettings(settings: WatermarkSettings) {
  const { effects } = settings;
  
  // Check if watermark is hidden
  if (effects.has('HIDE_WATERMARK')) {
    return null;
  }

  // Determine logo URL
  let logoUrl = DEFAULT_LOGO;
  if (effects.has('SHOW_XP_LOGO')) {
    logoUrl = XP_LOGO;
  } else if (effects.has('SHOW_TM_LOGO')) {
    logoUrl = TM_LOGO;
  } else if (effects.has('CUSTOM_LOGO')) {
    const customUrlEffect = Array.from(effects).find(e => e.startsWith('CUSTOM_LOGO_URL:'));
    if (customUrlEffect) {
      logoUrl = customUrlEffect.replace('CUSTOM_LOGO_URL:', '');
    }
  }

  // Get rotation (flat = 0deg, vertical = -90deg)
  const isFlat = effects.has('LOGO_FLAT');
  const rotationDegrees = isFlat ? 0 : -90;

  // Get size (default: smaller for vertical, larger for flat)
  let logoSize = isFlat ? 110 : 50;
  const sizeModifier = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
  if (sizeModifier) {
    const sizeValue = parseInt(sizeModifier.replace('LOGO_SIZE:', ''), 10);
    if (!isNaN(sizeValue) && sizeValue > 0) {
      logoSize = sizeValue;
    }
  }

  // Get position (relative to chart container)
  let logoX = 0;
  let logoY = 0;
  
  const xModifier = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
  if (xModifier) {
    const xValue = parseInt(xModifier.replace('LOGO_X:', ''), 10);
    if (!isNaN(xValue)) {
      logoX = xValue;
      // When flat, move 5 units to the right (decrease logoX by 5) even if LOGO_X is set
      if (isFlat) {
        logoX = Math.max(0, logoX - 5);
      }
    }
  } else {
    // Default position calculation (matching Watermark.tsx logic)
    const { chartContainerWidth } = settings;
    const effWidth = isFlat ? logoSize : logoSize * 0.3;
    logoX = Math.max(0, chartContainerWidth - effWidth - 60);
    // When flat, move 5 units to the right (decrease logoX by 5)
    if (isFlat) {
      logoX = Math.max(0, logoX - 5);
    }
  }
  
  const yModifier = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
  if (yModifier) {
    const yValue = parseInt(yModifier.replace('LOGO_Y:', ''), 10);
    if (!isNaN(yValue)) {
      logoY = yValue;
    }
  } else {
    // Default position calculation (matching Watermark.tsx logic)
    const { chartContainerHeight } = settings;
    const effHeight = isFlat ? logoSize * 0.3 : logoSize;
    logoY = Math.max(0, chartContainerHeight - effHeight - 60);
  }

  // Get opacity (default 0.6, clamped 0.4-1.0)
  const opacityEffect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
  const parsedOpacity = opacityEffect ? parseFloat(opacityEffect.replace('LOGO_OPACITY:', '')) : 0.6;
  const logoOpacity = Math.max(0.4, Math.min(1, isNaN(parsedOpacity) ? 0.6 : parsedOpacity));

  return {
    logoUrl,
    rotationDegrees,
    logoSize,
    logoX,
    logoY,
    logoOpacity,
    isFlat
  };
}

/**
 * Loads an image with CORS handling
 */
function loadImageWithCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        reject(new Error('Image failed to load'));
      }
    };
    
    img.onerror = () => {
      // Try fallback to local asset if remote fails
      const fallbackUrl = '/segmentor-logo.png';
      if (url !== fallbackUrl) {
        loadImageWithCors(fallbackUrl).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to load image: ${url}`));
      }
    };
    
    img.src = url;
  });
}

/**
 * Composes watermark onto export canvas with proper aspect ratio
 * 
 * @param canvas - The export canvas to draw on
 * @param settings - Watermark settings parsed from effects
 * @param padding - Padding applied to the export (for position calculation)
 */
export async function composeWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  settings: WatermarkSettings,
  padding: { top: number; right: number; bottom: number; left: number }
): Promise<void> {
  const parsed = parseWatermarkSettings(settings);
  if (!parsed) return; // Watermark is hidden

  try {
    // Load the logo image with CORS
    const img = await loadImageWithCors(parsed.logoUrl);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get natural aspect ratio
    const naturalAspect = img.naturalWidth / img.naturalHeight;
    
    // Calculate display size preserving natural aspect ratio
    // Key principle: After -90deg rotation, dimensions swap:
    //   pre-rotation width → post-rotation height
    //   pre-rotation height → post-rotation width
    let displayWidth: number;
    let displayHeight: number;
    
    if (parsed.isFlat) {
      // Flat: logoSize is the intended width
      displayWidth = parsed.logoSize * 2; // Scale for 2x export
      displayHeight = displayWidth / naturalAspect;
    } else {
      // Vertical (-90deg): We want final visual height = logoSize
      // Since rotation swaps dimensions: pre-rotation width becomes post-rotation height
      // Therefore: pre-rotation width = logoSize (scaled for 2x)
      //            pre-rotation height = width / naturalAspect = logoSize / naturalAspect
      displayWidth = parsed.logoSize * 2;
      displayHeight = displayWidth / naturalAspect;
      
      // This ensures: after rotation, visual height = displayWidth = logoSize * 2
      //              after rotation, visual width = displayHeight = (logoSize * 2) / naturalAspect
      // The image will maintain its natural aspect ratio and won't be stretched
    }

    // Calculate position on canvas accounting for padding
    // logoX/logoY are relative to chart-container, need to add padding offset
    // DOM uses left: 10 + logoX, top: 10 + logoY, so account for that offset
    const x = padding.left + (10 + parsed.logoX) * 2; // Scale for 2x export + DOM offset
    const y = padding.top + (10 + parsed.logoY) * 2; // Scale for 2x export + DOM offset

    // Draw with rotation centered on the image
    ctx.save();
    ctx.globalAlpha = parsed.logoOpacity;
    
    // Move to rotation center (center of the image)
    const centerX = x + displayWidth / 2;
    const centerY = y + displayHeight / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((parsed.rotationDegrees * Math.PI) / 180);
    
    // Draw image centered at origin (since we translated to center)
    ctx.drawImage(
      img,
      -displayWidth / 2,
      -displayHeight / 2,
      displayWidth,
      displayHeight
    );
    
    ctx.restore();
  } catch (error) {
    console.warn('Failed to compose watermark:', error);
    // Gracefully fail - export continues without watermark
  }
}

