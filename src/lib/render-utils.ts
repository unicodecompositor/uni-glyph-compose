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
 * angle = expansion direction, force = intensity.
 *
 * The symbol itself is not rotated — only the distortion field direction changes.
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

  // 0..200 (editor) -> 0..2 distortion range
  const intensity = Math.max(-2, Math.min(2, st.force / 100));
  if (Math.abs(intensity) < 0.001) {
    ctx.drawImage(source, x, y, w, h);
    return;
  }

  const rad = st.angle * Math.PI / 180;
  const steps = Math.max(32, Math.round(Math.max(w, h) / 2));

  // Work in local space centered on the symbol.
  // X axis points to expansion direction, Y axis is the "width" to stretch/compress.
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;

    const stripX = -w / 2 + t0 * w;
    const stripW = (t1 - t0) * w;
    const sx = t0 * sourceW;
    const sw = (t1 - t0) * sourceW;

    if (sw <= 0 || stripW <= 0) continue;

    // -1..1 along expansion axis: opposite side narrows, finger side expands
    const centerNorm = (stripX + stripW / 2) / (w / 2);
    const spread = 1 + centerNorm * intensity;
    const stripH = h * Math.max(0.02, spread);
    const stripY = -stripH / 2;

    // Tiny overlap prevents visible seams between strips
    const drawW = stripW + 0.5;
    ctx.drawImage(source, sx, 0, sw, sourceH, stripX, stripY, drawW, stripH);
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