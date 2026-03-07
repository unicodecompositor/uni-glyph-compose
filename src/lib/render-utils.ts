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
 * Shared vertex-based deformation for both trapezoid (st) and parallelogram (sp).
 * Computes 4 transformed corners from a rectangle using angle+force.
 *
 * Trapezoid (st): vertices spread PERPENDICULAR to the swipe direction.
 *   Vertices "ahead" of the swipe expand sideways, those "behind" contract.
 *
 * Parallelogram (sp): vertices shift ALONG the swipe direction.
 *   Vertices "ahead" push further forward, those "behind" push backward.
 */
interface Vertex { x: number; y: number }

function applyVertexDeformation(
  corners: Vertex[],
  centerX: number, centerY: number,
  angle: number, force: number,
  mode: 'st' | 'sp',
): Vertex[] {
  const rad = angle * Math.PI / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);
  const perpX = -dirY;
  const perpY = dirX;

  return corners.map(v => {
    const rx = v.x - centerX;
    const ry = v.y - centerY;

    // How far this vertex is along the swipe direction
    const dAlong = rx * dirX + ry * dirY;
    // How far this vertex is sideways from the swipe axis
    const dSide = rx * perpX + ry * perpY;

    const spread = dAlong * force * 0.005;

    if (mode === 'st') {
      // Trapezoid: scale the perpendicular displacement
      const scaleAtPoint = 1.0 + spread;
      return {
        x: centerX + (dirX * dAlong) + (perpX * dSide * scaleAtPoint),
        y: centerY + (dirY * dAlong) + (perpY * dSide * scaleAtPoint),
      };
    } else {
      // Parallelogram: shift along the swipe direction
      return {
        x: v.x + dirX * spread,
        y: v.y + dirY * spread,
      };
    }
  });
}

/**
 * Apply parallelogram (sp) transform to canvas context.
 * Uses vertex deformation: shifts vertices along swipe direction.
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
 * Pure vertex-based: NO ctx.rotate, NO ctx.transform.
 * Each horizontal strip's 4 corners are deformed via applyVertexDeformation,
 * then drawn as an axis-aligned rect using averaged coordinates.
 * The image content does NOT rotate — only the shape deforms.
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

  if (Math.abs(st.force) < 0.5) {
    ctx.drawImage(source, x, y, w, h);
    return;
  }

  const cx = x + w / 2;
  const cy = y + h / 2;

  // Use a grid of strips for better approximation at diagonal angles
  const stepsY = Math.max(20, Math.round(h / 3));
  const stepsX = Math.max(20, Math.round(w / 3));

  ctx.save();
  for (let row = 0; row < stepsY; row++) {
    for (let col = 0; col < stepsX; col++) {
      const t0y = row / stepsY;
      const t1y = (row + 1) / stepsY;
      const t0x = col / stepsX;
      const t1x = (col + 1) / stepsX;

      // 4 corners of this cell in original space
      const cellCorners: Vertex[] = [
        { x: x + t0x * w, y: y + t0y * h }, // TL
        { x: x + t1x * w, y: y + t0y * h }, // TR
        { x: x + t1x * w, y: y + t1y * h }, // BR
        { x: x + t0x * w, y: y + t1y * h }, // BL
      ];

      // Deform corners
      const [dTL, dTR, dBR, dBL] = applyVertexDeformation(cellCorners, cx, cy, st.angle, st.force, 'st');

      // Average to axis-aligned rect (no rotation!)
      const destLeft = (dTL.x + dBL.x) / 2;
      const destRight = (dTR.x + dBR.x) / 2;
      const destTop = (dTL.y + dTR.y) / 2;
      const destBottom = (dBL.y + dBR.y) / 2;

      const destW = destRight - destLeft;
      const destH = destBottom - destTop;
      if (destW <= 0 || destH <= 0) continue;

      // Source rect
      const sx = t0x * sourceW;
      const sy = t0y * sourceH;
      const sw = (t1x - t0x) * sourceW;
      const sh = (t1y - t0y) * sourceH;

      ctx.drawImage(source, sx, sy, sw, sh, destLeft, destTop, destW + 0.5, destH + 0.5);
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