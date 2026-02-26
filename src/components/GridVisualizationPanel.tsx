import React, { useState, useRef } from 'react';
import { UniCompSpec } from '@/lib/unicomp-parser';
import { UniCompRenderer } from '@/components/UniCompRenderer';
import { Button } from '@/components/ui/button';
import { Grid, Hash, Maximize2, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function drawSpecOnCanvas(
  ctx: CanvasRenderingContext2D,
  spec: UniCompSpec,
  canvasW: number,
  canvasH: number
) {
  function getRect(start: number, end: number, gridWidth: number) {
    const sx = start % gridWidth, sy = Math.floor(start / gridWidth);
    const ex = end % gridWidth, ey = Math.floor(end / gridWidth);
    return { x1: Math.min(sx, ex), y1: Math.min(sy, ey), x2: Math.max(sx, ex), y2: Math.max(sy, ey) };
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
    if (symbol.rotate) ctx.rotate((symbol.rotate * Math.PI) / 180);
    ctx.fillText(symbol.char, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

// Background grid component that extends beyond the editor canvas
const BackgroundGrid: React.FC<{
  spec: UniCompSpec | null;
  containerSize: number;
}> = ({ spec, containerSize }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas || !spec) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridWidth = spec.gridWidth;
    const gridHeight = spec.gridHeight;
    const cellSize = Math.min(containerSize / gridWidth, containerSize / gridHeight);
    
    // Fill the entire viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, vw, vh);

    // Calculate where the editor canvas is centered
    const editorW = cellSize * gridWidth;
    const editorH = cellSize * gridHeight;
    const offsetX = (vw - editorW) / 2;
    const offsetY = (vh - editorH) / 2;

    // Draw grid lines extending across the whole viewport using the same cell size
    ctx.strokeStyle = 'hsl(220, 15%, 15%)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    const startGridX = offsetX % cellSize;
    for (let x = startGridX; x < vw; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
      ctx.stroke();
    }

    // Horizontal lines
    const startGridY = offsetY % cellSize;
    for (let y = startGridY; y < vh; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y);
      ctx.stroke();
    }
  }, [spec, containerSize]);

  if (!spec) return null;

  return (
    <canvas
      ref={bgCanvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ top: 0, left: 0 }}
    />
  );
};

interface GridVisualizationPanelProps {
  spec: UniCompSpec | null;
  deferredSpec: UniCompSpec | null;
  showGrid: boolean;
  showIndices: boolean;
  containerSize: number;
  selectionSet: number[];
  lockedSet: number[];
  hiddenSet: number[];
  onToggleGrid: () => void;
  onToggleIndices: () => void;
  onCycleLayoutMode: () => void;
  onCellDoubleClick: (idx: number) => void;
  onUpdateCode: (code: string, isFinal: boolean) => void;
  onTripleTapEmpty: () => void;
  angleStep: number;
  extraToolbar?: React.ReactNode;
  canvasContainerRef?: React.RefObject<HTMLDivElement>;
  layoutMode?: 'normal' | 'split' | 'fullscreen';
  fullscreenViewMode?: 'edit' | 'preview';
}

export const GridVisualizationPanel: React.FC<GridVisualizationPanelProps> = ({
  spec,
  deferredSpec,
  showGrid,
  showIndices,
  containerSize,
  selectionSet,
  lockedSet,
  hiddenSet,
  onToggleGrid,
  onToggleIndices,
  onCycleLayoutMode,
  onCellDoubleClick,
  onUpdateCode,
  onTripleTapEmpty,
  angleStep,
  extraToolbar,
  canvasContainerRef,
  layoutMode = 'normal',
  fullscreenViewMode,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // In fullscreen mode, use the externally controlled view mode
  const effectiveViewMode = layoutMode === 'fullscreen' ? (fullscreenViewMode || 'edit') : viewMode;
  const isFullscreen = layoutMode === 'fullscreen';

  // Draw result preview into canvas
  React.useEffect(() => {
    if (effectiveViewMode !== 'preview') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const specToRender = deferredSpec;

    let canvasW = containerSize;
    let canvasH = containerSize;
    if (specToRender) {
      const ratio = specToRender.gridWidth / specToRender.gridHeight;
      if (ratio > 1) canvasH = containerSize / ratio;
      else canvasW = containerSize * ratio;
    }

    // In fullscreen, use larger canvas
    if (isFullscreen) {
      const maxW = window.innerWidth * 0.85;
      const maxH = (window.innerHeight - 80) * 0.85;
      if (specToRender) {
        const ratio = specToRender.gridWidth / specToRender.gridHeight;
        if (ratio > 1) {
          canvasW = Math.min(maxW, maxH * ratio);
          canvasH = canvasW / ratio;
        } else {
          canvasH = Math.min(maxH, maxW / ratio);
          canvasW = canvasH * ratio;
        }
      } else {
        canvasW = Math.min(maxW, maxH);
        canvasH = canvasW;
      }
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (!specToRender || specToRender.symbols.length === 0) {
      ctx.fillStyle = 'hsl(210, 15%, 30%)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('—', canvasW / 2, canvasH / 2);
      return;
    }

    drawSpecOnCanvas(ctx, specToRender, canvasW, canvasH);
  }, [effectiveViewMode, deferredSpec, containerSize, isFullscreen]);

  const handleExport = () => {
    const specToExport = deferredSpec;
    if (!specToExport) return;

    const W = 600;
    const H = Math.round(W * specToExport.gridHeight / specToExport.gridWidth);
    const exportCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    exportCanvas.width = W * dpr;
    exportCanvas.height = H * dpr;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    drawSpecOnCanvas(ctx, specToExport, W, H);

    const raw = specToExport.raw || '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>UniComp Export</title>
<style>
  body { margin: 0; background: #0d1117; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  canvas { max-width: 100%; height: auto; }
</style>
</head>
<body>
<canvas id="uc"></canvas>
<script>
// UniComp Rule: ${raw}
(function() {
  const COLOR_MAP = {
    red:'hsl(0,80%,55%)',green:'hsl(120,70%,45%)',blue:'hsl(210,80%,55%)',
    yellow:'hsl(50,90%,50%)',orange:'hsl(30,90%,55%)',purple:'hsl(280,70%,55%)',
    pink:'hsl(340,80%,60%)',cyan:'hsl(185,80%,50%)',white:'hsl(0,0%,100%)',
    black:'hsl(0,0%,10%)',gray:'hsl(0,0%,50%)',grey:'hsl(0,0%,50%)',
  };
  function resolveColor(c,fb){if(!c)return fb;return COLOR_MAP[c.toLowerCase()]||c;}
  const spec = ${JSON.stringify(specToExport)};
  const canvas = document.getElementById('uc');
  const W = 800;
  const H = Math.round(W * spec.gridHeight / spec.gridWidth);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cw = W / spec.gridWidth;
  const ch = H / spec.gridHeight;
  spec.symbols.forEach(function(s) {
    const sx = s.start % spec.gridWidth, sy = Math.floor(s.start / spec.gridWidth);
    const ex = s.end % spec.gridWidth, ey = Math.floor(s.end / spec.gridWidth);
    const x1 = Math.min(sx,ex)*cw, y1 = Math.min(sy,ey)*ch;
    const w = (Math.abs(ex-sx)+1)*cw, h = (Math.abs(ey-sy)+1)*ch;
    const fs = Math.min(w*(s.scale&&s.scale.x||1), h*(s.scale&&s.scale.y||1))*0.85;
    ctx.font = fs+'px '+(s.fontFamily||'system-ui');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = s.opacity||1;
    ctx.fillStyle = resolveColor(s.color,'hsl(210,20%,92%)');
    ctx.save();
    ctx.translate(x1+w/2, y1+h/2);
    if(s.flip){ctx.scale(s.flip==='h'||s.flip==='hv'?-1:1, s.flip==='v'||s.flip==='hv'?-1:1);}
    if(s.rotate){ctx.rotate(s.rotate*Math.PI/180);}
    ctx.fillText(s.char,0,0);
    ctx.restore();
    ctx.globalAlpha=1;
  });
})();
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unicomp-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // In fullscreen, don't show internal header/controls — they're in the floating toolbar
  if (isFullscreen) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full relative" ref={canvasContainerRef}>
        {/* Background grid extending beyond the editor */}
        <BackgroundGrid spec={spec} containerSize={containerSize} />
        
        {/* Hidden export button for fullscreen toolbar */}
        <button
          ref={exportButtonRef}
          data-grid-viz-export
          className="hidden"
          onClick={handleExport}
        />

        {effectiveViewMode === 'edit' ? (
          <div className="relative z-10">
            <UniCompRenderer
              spec={spec}
              showGrid={showGrid}
              showIndices={showIndices}
              size={containerSize}
              selectionSet={selectionSet}
              lockedSet={lockedSet}
              hiddenSet={hiddenSet}
              onCellDoubleClick={onCellDoubleClick}
              onUpdateCode={onUpdateCode}
              onTripleTapEmpty={onTripleTapEmpty}
              angleStep={angleStep}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center relative z-10">
            {deferredSpec && deferredSpec.symbols.length > 0 ? (
              <canvas ref={previewCanvasRef} className="rounded-lg" />
            ) : (
              <span className="text-muted-foreground text-sm">No result to preview</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Normal/Split mode — original UI with header
  const displayToggles = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", showGrid && "text-primary")}
        onClick={onToggleGrid}
        title="Toggle Grid"
      >
        <Grid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", showIndices && "text-primary")}
        onClick={onToggleIndices}
        title="Toggle Indices"
      >
        <Hash className="h-4 w-4" />
      </Button>
    </>
  );

  const headerControls = (
    <div className="flex items-center gap-1">
      {displayToggles}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", viewMode === 'preview' && "text-primary")}
        onClick={() => setViewMode(v => v === 'edit' ? 'preview' : 'edit')}
        title={viewMode === 'edit' ? 'Switch to Result Preview' : 'Switch to Edit Mode'}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleExport}
        title="Export as HTML Canvas"
        disabled={!deferredSpec}
      >
        <Download className="h-4 w-4" />
      </Button>
      {extraToolbar}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onCycleLayoutMode}
        title="Expand view"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center relative min-h-[400px] w-full h-full" ref={canvasContainerRef}>
      <div className="panel-header w-full flex items-center justify-between mb-4">
        <span>GRID VISUALIZATION {viewMode === 'preview' ? '— RESULT' : ''}</span>
        {headerControls}
      </div>

      {viewMode === 'edit' ? (
        <UniCompRenderer
          spec={spec}
          showGrid={showGrid}
          showIndices={showIndices}
          size={containerSize}
          selectionSet={selectionSet}
          lockedSet={lockedSet}
          hiddenSet={hiddenSet}
          onCellDoubleClick={onCellDoubleClick}
          onUpdateCode={onUpdateCode}
          onTripleTapEmpty={onTripleTapEmpty}
          angleStep={angleStep}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full flex-1">
          <div
            className="rounded-lg bg-background border border-border p-4 glow-primary flex items-center justify-center"
            style={{
              width: containerSize,
              height: containerSize,
              maxWidth: '100%',
            }}
          >
            {deferredSpec && deferredSpec.symbols.length > 0 ? (
              <canvas ref={previewCanvasRef} />
            ) : (
              <span className="text-muted-foreground text-sm">No result to preview</span>
            )}
          </div>
          {deferredSpec && (
            <code className="mt-2 text-[10px] text-muted-foreground font-mono max-w-[300px] truncate">
              {deferredSpec.raw}
            </code>
          )}
        </div>
      )}
    </div>
  );
};
