import React, { useRef, useEffect } from 'react';
import { UniCompSpec, getRect, getRegistry } from '@/lib/unicomp-parser';
import { resolveColor, renderSpecToOffscreen, applySymbolTransforms, drawTrapezoidal } from '@/lib/render-utils';

interface ResultPreviewProps {
  spec: UniCompSpec | null;
  size?: number;
}

export const ResultPreview: React.FC<ResultPreviewProps> = ({ spec, size = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    let canvasW = size;
    let canvasH = size;
    
    if (spec) {
      const ratio = spec.gridWidth / spec.gridHeight;
      if (ratio > 1) {
        canvasH = size / ratio;
      } else {
        canvasW = size * ratio;
      }
    }
    
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasW, canvasH);

    if (!spec || spec.symbols.length === 0) {
      ctx.fillStyle = 'hsl(210, 15%, 30%)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('—', canvasW / 2, canvasH / 2);
      return;
    }

    const cellWidth = canvasW / spec.gridWidth;
    const cellHeight = canvasH / spec.gridHeight;

    const registry = getRegistry();

    spec.symbols.forEach((symbol) => {
      const rect = getRect(symbol.start, symbol.end, spec.gridWidth);

      const x1 = rect.x1 * cellWidth;
      const y1 = rect.y1 * cellHeight;
      const width = (rect.x2 - rect.x1 + 1) * cellWidth;
      const height = (rect.y2 - rect.y1 + 1) * cellHeight;

      const entry = registry.resolve(symbol);
      if (entry) {
        const offscreen = renderSpecToOffscreen(entry.spec, 64, 'hsl(210, 20%, 92%)');
        ctx.save();
        ctx.globalAlpha = symbol.opacity ?? 1;
        ctx.translate(x1 + width / 2, y1 + height / 2);
        applySymbolTransforms(ctx, symbol);
        if (symbol.st) {
          drawTrapezoidal(ctx, offscreen, -width / 2, -height / 2, width, height, symbol.st);
        } else {
          ctx.drawImage(offscreen, -width / 2, -height / 2, width, height);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        return;
      }

      const scaleX = symbol.scale?.x ?? 1;
      const scaleY = symbol.scale?.y ?? 1;
      const fontSize = Math.min(width * scaleX, height * scaleY) * 0.85;
      const fontFamily = symbol.fontFamily || 'Inter, system-ui';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.globalAlpha = symbol.opacity ?? 1;
      ctx.fillStyle = resolveColor(symbol.color, 'hsl(210, 20%, 92%)');

      ctx.save();
      ctx.translate(x1 + width / 2, y1 + height / 2);
      applySymbolTransforms(ctx, symbol);
      ctx.fillText(symbol.char, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }, [spec, size]);

  const aspectRatio = spec ? spec.gridWidth / spec.gridHeight : 1;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="panel-header">Result</div>
      <div
        className="rounded-lg bg-background border border-border p-4 glow-primary flex items-center justify-center"
        style={{ aspectRatio: String(aspectRatio), maxWidth: `${size}px`, width: '100%' }}
      >
        <canvas ref={canvasRef} />
      </div>
      {spec && (
        <code className="text-[10px] text-muted-foreground font-mono max-w-[150px] truncate">
          {spec.raw}
        </code>
      )}
    </div>
  );
};