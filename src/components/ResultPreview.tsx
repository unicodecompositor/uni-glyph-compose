import React, { useRef, useEffect } from 'react';
import { UniCompSpec, getRect } from '@/lib/unicomp-parser';

const COLOR_MAP: Record<string, string> = {
  red: 'hsl(0, 80%, 55%)', green: 'hsl(120, 70%, 45%)', blue: 'hsl(210, 80%, 55%)',
  yellow: 'hsl(50, 90%, 50%)', orange: 'hsl(30, 90%, 55%)', purple: 'hsl(280, 70%, 55%)',
  pink: 'hsl(340, 80%, 60%)', cyan: 'hsl(185, 80%, 50%)', white: 'hsl(0, 0%, 100%)',
  black: 'hsl(0, 0%, 10%)', gray: 'hsl(0, 0%, 50%)', grey: 'hsl(0, 0%, 50%)',
};

function resolveColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  if (COLOR_MAP[color.toLowerCase()]) return COLOR_MAP[color.toLowerCase()];
  return color;
}

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
    
    // Calculate proper dimensions based on grid aspect ratio
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

    spec.symbols.forEach((symbol) => {
      const rect = getRect(symbol.start, symbol.end, spec.gridWidth);

      const x1 = rect.x1 * cellWidth;
      const y1 = rect.y1 * cellHeight;
      const width = (rect.x2 - rect.x1 + 1) * cellWidth;
      const height = (rect.y2 - rect.y1 + 1) * cellHeight;

      const scaleX = symbol.scale?.x ?? 1;
      const scaleY = symbol.scale?.y ?? 1;
      const fontSize = Math.min(width * scaleX, height * scaleY) * 0.85;
      const fontFamily = symbol.fontFamily || 'Inter, system-ui';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.globalAlpha = symbol.opacity ?? 1;
      ctx.fillStyle = resolveColor(symbol.color, 'hsl(210, 20%, 92%)');

      const centerX = x1 + width / 2;
      const centerY = y1 + height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);

      if (symbol.flip) {
        const flipX = symbol.flip === 'h' || symbol.flip === 'hv' ? -1 : 1;
        const flipY = symbol.flip === 'v' || symbol.flip === 'hv' ? -1 : 1;
        ctx.scale(flipX, flipY);
      }

      if (symbol.rotate) {
        ctx.rotate((symbol.rotate * Math.PI) / 180);
      }

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
