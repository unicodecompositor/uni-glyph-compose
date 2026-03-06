import { UniCompSpec, SymbolSpec, getRect, getRegistry } from '@/lib/unicomp-parser';

const COLOR_MAP: Record<string, string> = {
  red: 'hsl(0, 80%, 55%)', green: 'hsl(120, 70%, 45%)', blue: 'hsl(210, 80%, 55%)',
  yellow: 'hsl(50, 90%, 50%)', orange: 'hsl(30, 90%, 55%)', purple: 'hsl(280, 70%, 55%)',
  pink: 'hsl(340, 80%, 60%)', cyan: 'hsl(185, 80%, 50%)', white: 'hsl(0, 0%, 100%)',
  black: 'hsl(0, 0%, 10%)', gray: 'hsl(0, 0%, 50%)', grey: 'hsl(0, 0%, 50%)',
};

export function resolveColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  if (COLOR_MAP[color.toLowerCase()]) return COLOR_MAP[color.toLowerCase()];
  return color;
}

/**
 * Apply parallelogram (sp) transform to canvas context.
 * Uses angle+force to compute a shear matrix.
 * angle = direction of shear in degrees, force = intensity
 */
export function applyParallelogram(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  sp: { angle: number; force: number },
) {
  const rad = sp.angle * Math.PI / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);
  const intensity = sp.force * 0.01;
  // Shear along the direction vector
  ctx.transform(1 + dirX * dirX * intensity, dirY * dirX * intensity, dirX * dirY * intensity, 1 + dirY * dirY * intensity, 0, 0);
}

/**
 * Draw with trapezoid (st) distortion using strip approximation.
 * angle = direction of taper, force = intensity of narrowing
 */
export function drawTrapezoidal(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement,
  x: number, y: number, w: number, h: number,
  st: { angle: number; force: number },
) {
  const force = st.force * 0.001;
  if (Math.abs(force) < 0.0001) {
    ctx.drawImage(source, x, y, w, h);
    return;
  }

  const rad = st.angle * Math.PI / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);
  // perpendicular vector
  const perpX = -dirY;
  const perpY = dirX;

  const steps = Math.max(24, Math.round(Math.max(w, h) / 3));
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  ctx.save();

  // Determine if we slice horizontally or vertically based on dominant axis
  if (Math.abs(dirY) >= Math.abs(dirX)) {
    // Taper along Y: slice horizontally, each row width varies
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const t2 = (i + 1) / steps;
      const rowCenterY = y + (t + t2) / 2 * h;
      const relY = rowCenterY - centerY;
      // How far along the taper direction
      const distAlong = relY * dirY / (h / 2);
      const spread = 1 + distAlong * force * h;
      const rowW = w * Math.max(0.01, spread);
      const rowX = centerX - rowW / 2;
      const sy = t * source.height;
      const sh = (t2 - t) * source.height;
      const dy = y + t * h;
      const dh = (t2 - t) * h;
      if (sh > 0 && dh > 0) {
        ctx.drawImage(source, 0, sy, source.width, sh, rowX, dy, rowW, dh);
      }
    }
  } else {
    // Taper along X: slice vertically, each column height varies
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const t2 = (i + 1) / steps;
      const colCenterX = x + (t + t2) / 2 * w;
      const relX = colCenterX - centerX;
      const distAlong = relX * dirX / (w / 2);
      const spread = 1 + distAlong * force * w;
      const colH = h * Math.max(0.01, spread);
      const colY = centerY - colH / 2;
      const sx = t * source.width;
      const sw = (t2 - t) * source.width;
      const dx = x + t * w;
      const dw = (t2 - t) * w;
      if (sw > 0 && dw > 0) {
        ctx.drawImage(source, sx, 0, sw, source.height, dx, colY, dw, colH);
      }
    }
  }

  ctx.restore();
}

/**
 * Apply all deformation transforms for a symbol to the canvas context.
 * Call after translate to center. For trapezoid, returns true (caller must use drawTrapezoidal).
 */
export function applySymbolTransforms(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  sym: SymbolSpec,
) {
  if (sym.flip) {
    const fx = sym.flip === 'h' || sym.flip === 'hv' ? -1 : 1;
    const fy = sym.flip === 'v' || sym.flip === 'hv' ? -1 : 1;
    ctx.scale(fx, fy);
  }
  if (sym.rotate) ctx.rotate((sym.rotate * Math.PI) / 180);
  if (sym.sp) applyParallelogram(ctx, sym.sp);
}

/**
 * Renders a UniCompSpec to an OffscreenCanvas at its native grid proportions.
 */
export function renderSpecToOffscreen(
  spec: UniCompSpec,
  pixelsPerCell: number = 64,
  defaultColor: string = 'hsl(210, 20%, 92%)',
  depth: number = 0,
): OffscreenCanvas {
  if (depth > 20) {
    return new OffscreenCanvas(1, 1);
  }

  const w = spec.gridWidth * pixelsPerCell;
  const h = spec.gridHeight * pixelsPerCell;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const registry = getRegistry();

  spec.symbols.forEach((sym) => {
    const rect = getRect(sym.start, sym.end, spec.gridWidth);
    const x1 = rect.x1 * pixelsPerCell;
    const y1 = rect.y1 * pixelsPerCell;
    const sw = (rect.x2 - rect.x1 + 1) * pixelsPerCell;
    const sh = (rect.y2 - rect.y1 + 1) * pixelsPerCell;

    // Check for nested reference
    const entry = registry.resolve(sym);
    if (entry) {
      const nestedCanvas = renderSpecToOffscreen(entry.spec, pixelsPerCell, defaultColor, depth + 1);
      
      ctx.save();
      ctx.globalAlpha = sym.opacity ?? 1;
      ctx.translate(x1 + sw / 2, y1 + sh / 2);
      applySymbolTransforms(ctx, sym);
      if (sym.st) {
        drawTrapezoidal(ctx, nestedCanvas, -sw / 2, -sh / 2, sw, sh, sym.st);
      } else {
        ctx.drawImage(nestedCanvas, -sw / 2, -sh / 2, sw, sh);
      }
      ctx.restore();
      return;
    }

    // Regular symbol
    const scaleX = sym.scale?.x ?? 1;
    const scaleY = sym.scale?.y ?? 1;
    const fontSize = Math.min(sw * scaleX, sh * scaleY) * 0.85;
    const fontFamily = sym.fontFamily || 'Inter, system-ui';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = sym.opacity ?? 1;
    ctx.fillStyle = resolveColor(sym.color, defaultColor);

    ctx.save();
    ctx.translate(x1 + sw / 2, y1 + sh / 2);
    applySymbolTransforms(ctx, sym);
    ctx.fillText(sym.char, 0, 0);
    ctx.restore();
  });

  ctx.globalAlpha = 1;
  return canvas;
}