import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { UniCompSpec, getRect, stringifySpec } from '@/lib/unicomp-parser';
import { Move, RotateCw, Maximize2 } from 'lucide-react';
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

interface UniCompRendererProps {
  spec: UniCompSpec | null;
  showGrid?: boolean;
  showIndices?: boolean;
  highlightedCell?: number | null;
  onCellHover?: (index: number | null) => void;
  onCellClick?: (index: number) => void;
  onCellDoubleClick?: (index: number) => void;
  onUpdateCode?: (newCode: string, isFinal: boolean) => void;
  onTripleTapEmpty?: () => void;
  size?: number;
  selectionSet?: number[];
  lockedSet?: number[];
  hiddenSet?: number[];
  angleStep?: number;
}

const COLORS = [
  'hsl(185, 80%, 50%)', 'hsl(260, 70%, 60%)', 'hsl(150, 70%, 45%)',
  'hsl(40, 90%, 50%)', 'hsl(340, 75%, 55%)', 'hsl(200, 80%, 55%)',
];

export const UniCompRenderer: React.FC<UniCompRendererProps> = ({
  spec,
  showGrid = true,
  showIndices = false,
  highlightedCell = null,
  onCellHover,
  onCellClick,
  onCellDoubleClick,
  onUpdateCode,
  onTripleTapEmpty,
  size = 400,
  selectionSet = [],
  lockedSet = [],
  hiddenSet = [],
  angleStep = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);
  
  // Editing state
  const [isEditing, setIsEditing] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [editStartPos, setEditStartPos] = useState<{ x: number, y: number } | null>(null);
  const [initialSpec, setInitialSpec] = useState<UniCompSpec | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const initialAngleRef = useRef<number | null>(null);
  const rotationCenterRef = useRef<{ x: number, y: number } | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  const gridWidth = spec?.gridWidth || spec?.gridSize || 10;
  const gridHeight = spec?.gridHeight || spec?.gridSize || 10;

  const cellSize = Math.min(size / gridWidth, size / gridHeight);
  const canvasWidth = cellSize * gridWidth;
  const canvasHeight = cellSize * gridHeight;

  const selectionBounds = useMemo(() => {
    if (selectionSet.length === 0 || !spec) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectionSet.forEach(idx => {
      const symbol = spec.symbols[idx];
      if (!symbol) return;
      const rect = getRect(symbol.start, symbol.end, gridWidth);
      minX = Math.min(minX, rect.x1);
      minY = Math.min(minY, rect.y1);
      maxX = Math.max(maxX, rect.x2);
      maxY = Math.max(maxY, rect.y2);
    });
    if (minX === Infinity) return null;
    return {
      gridX: minX, gridY: minY, gridW: maxX - minX + 1, gridH: maxY - minY + 1,
      x: minX * cellSize, y: minY * cellSize, width: (maxX - minX + 1) * cellSize, height: (maxY - minY + 1) * cellSize
    };
  }, [selectionSet, spec, gridWidth, cellSize]);

  const handleEditStart = (type: 'move' | 'scale' | 'rotate', e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    longPressTimer.current = setTimeout(() => {
      setIsLongPressActive(true);
      setIsEditing(type);
      setEditStartPos({ x: clientX, y: clientY });
      setInitialSpec(JSON.parse(JSON.stringify(spec)));
      // For atan2 rotation: store fixed center and initial angle
      if (type === 'rotate' && selectionBounds && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const cx = canvasRect.left + selectionBounds.x + selectionBounds.width / 2;
        const cy = canvasRect.top + selectionBounds.y + selectionBounds.height / 2;
        rotationCenterRef.current = { x: cx, y: cy };
        initialAngleRef.current = Math.atan2(clientY - cy, clientX - cx);
      }
      document.body.classList.add('dragging-active');
    }, 1000);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (!isLongPressActive && editStartPos) {
        const dist = Math.sqrt(Math.pow(clientX - editStartPos.x, 2) + Math.pow(clientY - editStartPos.y, 2));
        if (dist > 10) {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }
    }

    if (!isEditing || !editStartPos || !initialSpec || !onUpdateCode) return;

    const dx = clientX - editStartPos.x;
    const dy = clientY - editStartPos.y;
    
    // Mobile sensitivity adjustment for rotation
    const isMobile = 'ontouchstart' in window;
    const rotationSensitivity = isMobile ? (window.innerWidth / 200) : 5;
    
    const gridDx = Math.round(dx / cellSize);
    const gridDy = Math.round(dy / cellSize);

    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return;
    lastUpdateRef.current = now;

    let newSpec = JSON.parse(JSON.stringify(initialSpec)) as UniCompSpec;
    
    // Grid expansion logic
    if (isEditing === 'move' || isEditing === 'scale') {
      let minRequiredX = 0;
      let minRequiredY = 0;
      let maxRequiredX = newSpec.gridWidth;
      let maxRequiredY = newSpec.gridHeight;

      selectionSet.forEach(idx => {
        const sym = newSpec.symbols[idx];
        if (!sym) return;
        const rect = getRect(sym.start, sym.end, initialSpec.gridWidth);
        
        if (isEditing === 'move') {
          minRequiredX = Math.min(minRequiredX, rect.x1 + gridDx);
          minRequiredY = Math.min(minRequiredY, rect.y1 + gridDy);
          maxRequiredX = Math.max(maxRequiredX, rect.x1 + gridDx + rect.width);
          maxRequiredY = Math.max(maxRequiredY, rect.y1 + gridDy + rect.height);
        } else if (isEditing === 'scale') {
          const newW = rect.width + gridDx;
          const newH = rect.height + gridDy;
          if (newW < 0) minRequiredX = Math.min(minRequiredX, rect.x1 + newW);
          else maxRequiredX = Math.max(maxRequiredX, rect.x1 + newW);
          
          if (newH < 0) minRequiredY = Math.min(minRequiredY, rect.y1 + newH);
          else maxRequiredY = Math.max(maxRequiredY, rect.y1 + newH);
        }
      });

      const expandLeft = minRequiredX < 0 ? Math.abs(minRequiredX) : 0;
      const expandTop = minRequiredY < 0 ? Math.abs(minRequiredY) : 0;
      const expandRight = maxRequiredX > newSpec.gridWidth ? maxRequiredX - newSpec.gridWidth : 0;
      const expandBottom = maxRequiredY > newSpec.gridHeight ? maxRequiredY - newSpec.gridHeight : 0;

      if (expandLeft > 0 || expandTop > 0 || expandRight > 0 || expandBottom > 0) {
        const oldW = newSpec.gridWidth;
        const newW = Math.min(100, oldW + expandLeft + expandRight);
        const newH = Math.min(100, newSpec.gridHeight + expandTop + expandBottom);
        
        newSpec.symbols = newSpec.symbols.map((s, symIdx) => {
          const r = getRect(s.start, s.end, oldW);
          const isSelected = selectionSet.includes(symIdx);
          
          // Non-selected symbols (including locked/hidden) shift with grid expansion
          // Selected symbols also shift their anchor point, but their movement/scale
          // will be applied afterwards, creating the visual effect of moving left/up
          const shiftX = expandLeft;
          const shiftY = expandTop;
          
          return {
            ...s,
            start: (r.y1 + shiftY) * newW + (r.x1 + shiftX),
            end: (r.y2 + shiftY) * newW + (r.x2 + shiftX)
          };
        });
        newSpec.gridWidth = newW;
        newSpec.gridHeight = newH;
        
        editStartPos.x -= expandLeft * cellSize;
        editStartPos.y -= expandTop * cellSize;
      }
    }

    const currentGridW = newSpec.gridWidth;
    const currentGridH = newSpec.gridHeight;

    // Atan2-based rotation: absolute delta from initial angle (not incremental)
    let deltaAngleDeg = 0;
    if (isEditing === 'rotate' && rotationCenterRef.current && initialAngleRef.current !== null) {
      const { x: cx, y: cy } = rotationCenterRef.current;
      const currentAngle = Math.atan2(clientY - cy, clientX - cx);
      deltaAngleDeg = (currentAngle - initialAngleRef.current) * (180 / Math.PI);
    }

    selectionSet.forEach(idx => {
      const sym = newSpec.symbols[idx];
      if (!sym) return;
      
      const rect = getRect(sym.start, sym.end, currentGridW);
      
      if (isEditing === 'move') {
        const newX1 = Math.max(0, Math.min(currentGridW - rect.width, rect.x1 + gridDx));
        const newY1 = Math.max(0, Math.min(currentGridH - rect.height, rect.y1 + gridDy));
        sym.start = newY1 * currentGridW + newX1;
        sym.end = (newY1 + rect.height - 1) * currentGridW + (newX1 + rect.width - 1);
      } else if (isEditing === 'scale') {
        let newW = rect.width + gridDx;
        let newH = rect.height + gridDy;
        
        let flipH = sym.flip === 'h' || sym.flip === 'hv';
        let flipV = sym.flip === 'v' || sym.flip === 'hv';
        
        if (newW < 0) {
          flipH = !flipH;
          newW = Math.abs(newW);
        }
        if (newH < 0) {
          flipV = !flipV;
          newH = Math.abs(newH);
        }
        
        sym.flip = flipH && flipV ? 'hv' : flipH ? 'h' : flipV ? 'v' : undefined;
        newW = Math.max(1, Math.min(currentGridW - rect.x1, newW));
        newH = Math.max(1, Math.min(currentGridH - rect.y1, newH));
        
        sym.end = (rect.y1 + newH - 1) * currentGridW + (rect.x1 + newW - 1);
      } else if (isEditing === 'rotate') {
        const origSym = initialSpec.symbols[idx];
        const baseRotate = origSym?.rotate || 0;
        const snappedDelta = Math.round(deltaAngleDeg / angleStep) * angleStep;
        let newRotate = baseRotate + snappedDelta;
        newRotate = ((newRotate % 360) + 360) % 360;
        sym.rotate = newRotate;
      }
    });

    onUpdateCode(stringifySpec(newSpec), false);
  }, [isEditing, editStartPos, initialSpec, selectionSet, cellSize, onUpdateCode, isLongPressActive]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (isEditing && spec && onUpdateCode) {
      onUpdateCode(stringifySpec(spec), true);
    }
    setIsEditing(null);
    setEditStartPos(null);
    setInitialSpec(null);
    setIsLongPressActive(false);
    initialAngleRef.current = null;
    rotationCenterRef.current = null;
    document.body.classList.remove('dragging-active');
  }, [isEditing, spec, onUpdateCode]);

  useEffect(() => {
    if (isEditing || longPressTimer.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isEditing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'hsl(220, 18%, 10%)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (showGrid) {
      ctx.strokeStyle = 'hsl(220, 15%, 25%)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridWidth; i++) {
        const pos = i * cellSize;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvasHeight); ctx.stroke();
      }
      for (let i = 0; i <= gridHeight; i++) {
        const pos = i * cellSize;
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvasWidth, pos); ctx.stroke();
      }
    }

    if (showIndices) {
      ctx.font = `${Math.max(8, cellSize * 0.25)}px JetBrains Mono`;
      ctx.fillStyle = 'hsl(210, 15%, 40%)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const index = y * gridWidth + x;
          ctx.fillText(index.toString(), x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
        }
      }
    }

    if (spec?.symbols) {
      spec.symbols.forEach((symbol, idx) => {
        if (hiddenSet.includes(idx)) return;
        const isSelected = selectionSet.includes(idx);
        const isLocked = lockedSet.includes(idx);
        const rect = getRect(symbol.start, symbol.end, gridWidth);
        let color = COLORS[idx % COLORS.length];
        if (isLocked) color = 'hsl(0, 0%, 50%)';
        const x1 = rect.x1 * cellSize;
        const y1 = rect.y1 * cellSize;
        const width = (rect.x2 - rect.x1 + 1) * cellSize;
        const height = (rect.y2 - rect.y1 + 1) * cellSize;
        ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.2)' : color.replace(')', ', 0.1)').replace('hsl', 'hsla');
        ctx.fillRect(x1, y1, width, height);
        ctx.strokeStyle = isSelected ? 'white' : color;
        ctx.lineWidth = isSelected ? 2 : 1;
        if (!isSelected) ctx.setLineDash([4, 4]);
        ctx.strokeRect(x1 + 1, y1 + 1, width - 2, height - 2);
        ctx.setLineDash([]);
        const fontSize = Math.min(width, height) * 0.7;
        const fontFamily = symbol.fontFamily || 'Inter, system-ui';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = isLocked ? 'hsl(0, 0%, 50%)' : resolveColor(symbol.color, color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = symbol.opacity ?? 1;
        if (!isLocked) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        const centerX = x1 + width / 2;
        const centerY = y1 + height / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        if (symbol.flip) {
          const scaleX = symbol.flip === 'h' || symbol.flip === 'hv' ? -1 : 1;
          const scaleY = symbol.flip === 'v' || symbol.flip === 'hv' ? -1 : 1;
          ctx.scale(scaleX, scaleY);
        }
        if (symbol.rotate) ctx.rotate((symbol.rotate * Math.PI) / 180);
        ctx.fillText(symbol.char, 0, 0);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
    }
  }, [spec, showGrid, showIndices, highlightedCell, hoveredCell, size, gridWidth, gridHeight, cellSize, canvasWidth, canvasHeight, selectionSet, lockedSet, hiddenSet]);

  return (
    <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
      <canvas
        ref={canvasRef}
        className="rounded-lg cursor-crosshair"
        onMouseMove={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = Math.floor((e.clientX - rect.left) / cellSize);
          const y = Math.floor((e.clientY - rect.top) / cellSize);
          const index = y * gridWidth + x;
          setHoveredCell(index);
          onCellHover?.(index);
        }}
        onMouseLeave={() => { setHoveredCell(null); onCellHover?.(null); }}
        onClick={(e) => {
          const now = Date.now();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (!canvasRect) return;
          const x = Math.floor((e.clientX - canvasRect.left) / cellSize);
          const y = Math.floor((e.clientY - canvasRect.top) / cellSize);
          const cellIndex = y * gridWidth + x;
          
          tapTimesRef.current.push(now);
          if (tapTimesRef.current.length > 3) tapTimesRef.current.shift();
          if (tapTimesRef.current.length >= 3 && tapTimesRef.current[tapTimesRef.current.length - 1] - tapTimesRef.current[tapTimesRef.current.length - 3] < 600) {
            const hasSymbol = spec?.symbols.some(s => {
              const r = getRect(s.start, s.end, gridWidth);
              return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
            });
            if (!hasSymbol) {
              onTripleTapEmpty?.();
              tapTimesRef.current = [];
              return;
            }
          }
          
          if (now - lastClickTime.current < 300) onCellDoubleClick?.(cellIndex);
          else onCellClick?.(cellIndex);
          lastClickTime.current = now;
        }}
      />
      
      {selectionBounds && (
        <div 
          className={cn("selection-outline", isLongPressActive && "selection-active")}
          style={{
            left: selectionBounds.x - 1.5,
            top: selectionBounds.y - 1.5,
            width: selectionBounds.width + 3,
            height: selectionBounds.height + 3,
          }}
        >
          <div 
            className="selection-handle selection-handle-tr" 
            onMouseDown={(e) => handleEditStart('rotate', e)}
            onTouchStart={(e) => handleEditStart('rotate', e)}
          >
            <RotateCw className="w-4 h-4" />
          </div>
          <div 
            className="selection-handle selection-handle-br" 
            onMouseDown={(e) => handleEditStart('scale', e)}
            onTouchStart={(e) => handleEditStart('scale', e)}
          >
            <Maximize2 className="w-4 h-4" />
          </div>
          <div 
            className="selection-handle selection-handle-center" 
            onMouseDown={(e) => handleEditStart('move', e)}
            onTouchStart={(e) => handleEditStart('move', e)}
          >
            <Move className="w-5 h-5" />
          </div>
        </div>
      )}

      {hoveredCell !== null && !isEditing && (
        <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur px-2 py-1 rounded text-xs font-mono text-primary pointer-events-none">
          [{hoveredCell}] → ({hoveredCell % gridWidth}, {Math.floor(hoveredCell / gridWidth)})
        </div>
      )}
    </div>
  );
};
