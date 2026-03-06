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
 * Draw with isosceles trapezoid (st) distortion in any direction.
 * angle = expansion direction (degrees), force = intensity (0-200).
 *
 * The symbol is NOT rotated. We slice the source image into strips
 * perpendicular to the expansion direction, scaling each strip's
 * "width" (perpendicular extent) based on its position along the
 * expansion axis. Strips near the finger side are wider, opposite
 * side narrower.
 */
export function drawTrapezoidal(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement,
  x: number, y: number, w: number, h: number,
  st: { angle: number; force: number },
) {
  const sourceW = source.width;
  const sourceH = source.height;
  if (!sourceW || !sourceH || w <= 0 || h <= 0) return;

  const intensity = Math.max(-2, Math.min(2, st.force / 100));
  if (Math.abs(intensity) < 0.001) {
    ctx.drawImage(source, x, y, w, h);
    return;
  }

  const rad = st.angle * Math.PI / 180;
  // Unit vectors: d = expansion direction, p = perpendicular
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = -dy; // perpendicular
  const py = dx;

  const cx = x + w / 2;
  const cy = y + h / 2;

  const steps = Math.max(40, Math.round(Math.max(w, h) / 2));

  ctx.save();

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;

    // Source rectangle for this strip (in source pixel coords)
    const sx = t0 * sourceW;
    const sw = (t1 - t0) * sourceW;
    const sy = 0;
    const sh = sourceH;
    if (sw <= 0) continue;

    // Position along expansion axis: -1 (opposite side) to +1 (finger side)
    const tMid = (t0 + t1) / 2;

    // Project the strip center onto the expansion axis to get signed distance
    // Strip center in destination space
    const stripCx = x + tMid * w;
    const stripCy = y + tMid * h;

    // Wait — we need to think differently. We slice the image into
    // vertical strips in SOURCE space. Each strip maps to a column
    // in the destination. The "perpendicular scaling" for each column
    // depends on how far along the expansion direction that column is.

    // Column center in dest space (before distortion)
    const colCx = x + tMid * w;
    const colCy = y + h / 2;

    // Signed projection of (colC - center) onto expansion direction
    const relX = colCx - cx;
    const relY = colCy - cy;
    const projD = relX * dx + relY * dy;
    // Normalize by half-diagonal
    const halfExtent = Math.abs(w / 2 * dx) + Math.abs(h / 2 * dy);
    const normProj = halfExtent > 0 ? projD / halfExtent : 0;

    // Scale perpendicular extent: +1 at finger side, -1 at opposite
    const spread = 1 + normProj * intensity;
    const clampedSpread = Math.max(0.02, spread);

    // The strip occupies a vertical column of the destination
    const destX = x + t0 * w;
    const destW = (t1 - t0) * w + 0.5; // tiny overlap to prevent seams

    // Scale height around center
    const destH = h * clampedSpread;
    const destY = cy - destH / 2;

    ctx.drawImage(source, sx, sy, sw, sh, destX, destY, destW, destH);
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