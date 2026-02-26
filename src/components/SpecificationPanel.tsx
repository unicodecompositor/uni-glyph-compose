import React, { useState } from 'react';
import { UniCompSpec, linearToCoords, getRect, stringifySpec, resizeGrid } from '@/lib/unicomp-parser';
import { Lock, Unlock, Eye, EyeOff, CheckSquare, Square, Trash2, X, GripVertical, Maximize2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SpecificationPanelProps {
  spec: UniCompSpec | null;
  selectionSet?: number[];
  lockedSet?: number[];
  hiddenSet?: number[];
  onToggleSelection?: (index: number) => void;
  onToggleLock?: (index: number) => void;
  onToggleHidden?: (index: number) => void;
  onUpdateCode?: (newCode: string, isFinal: boolean) => void;
  onRemoveFromSets?: (index: number) => void;
  onSetSelection?: (indices: number[]) => void;
  code?: string;
  onResize?: (newCode: string) => void;
  angleStep?: number;
  onAngleStepChange?: (step: number) => void;
}

const COLORS = [
  'hsl(185, 80%, 50%)', 'hsl(260, 70%, 60%)', 'hsl(150, 70%, 45%)',
  'hsl(40, 90%, 50%)', 'hsl(340, 75%, 55%)', 'hsl(200, 80%, 55%)',
];

export const SpecificationPanel: React.FC<SpecificationPanelProps> = ({
  spec,
  selectionSet = [],
  lockedSet = [],
  hiddenSet = [],
  onToggleSelection,
  onToggleLock,
  onToggleHidden,
  onUpdateCode,
  onRemoveFromSets,
  onSetSelection,
  code,
  onResize,
  angleStep = 10,
  onAngleStepChange,
}) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLayer, setEditLayer] = useState('');
  const [editZIndex, setEditZIndex] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [gridResizeOpen, setGridResizeOpen] = useState(false);
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [angleStepOpen, setAngleStepOpen] = useState(false);
  const [angleStepInput, setAngleStepInput] = useState(String(angleStep));

  // Sync grid resize fields when spec changes
  React.useEffect(() => {
    if (spec) {
      setNewWidth(String(spec.gridWidth));
      setNewHeight(String(spec.gridHeight));
    }
  }, [spec?.gridWidth, spec?.gridHeight]);

  if (!spec) {
    return (
      <div className="space-y-3">
        <div className="panel-header">Analysis</div>
        <p className="text-sm text-muted-foreground">Enter UniComp code for analysis</p>
      </div>
    );
  }

  const handleDelete = (idx: number) => {
    onRemoveFromSets?.(idx);
    const newSymbols = [...spec.symbols];
    newSymbols.splice(idx, 1);
    onUpdateCode?.(stringifySpec({ ...spec, symbols: newSymbols }), true);
  };

  const handleApplySettings = (idx: number) => {
    const newSymbols = [...spec.symbols];
    const sym = { ...newSymbols[idx] };

    const layerVal = editLayer.trim();
    if (layerVal) {
      (sym as any).layer = layerVal;
    }

    const targetZ = parseInt(editZIndex);
    if (!isNaN(targetZ) && targetZ !== idx) {
      newSymbols.splice(idx, 1);
      const insertAt = Math.max(0, Math.min(newSymbols.length, targetZ));
      newSymbols.splice(insertAt, 0, sym);
    } else {
      newSymbols[idx] = sym;
    }

    onUpdateCode?.(stringifySpec({ ...spec, symbols: newSymbols }), true);
    setEditingIdx(null);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    if (editingIdx !== null) setEditingIdx(null);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropTargetIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDropTargetIdx(null);
      return;
    }

    const isDraggedSelected = selectionSet.includes(draggedIdx);

    if (isDraggedSelected && selectionSet.length > 1) {
      const sorted = [...selectionSet].sort((a, b) => a - b);
      const groupSymbols = sorted.map(i => spec.symbols[i]);
      const remaining = spec.symbols.filter((_, i) => !selectionSet.includes(i));
      const removedBefore = sorted.filter(i => i < targetIdx).length;
      const adjustedTarget = Math.max(0, Math.min(remaining.length, targetIdx - removedBefore));
      remaining.splice(adjustedTarget, 0, ...groupSymbols);
      const newSelection = Array.from({ length: groupSymbols.length }, (_, i) => adjustedTarget + i);
      onUpdateCode?.(stringifySpec({ ...spec, symbols: remaining }), true);
      onSetSelection?.(newSelection);
    } else {
      const newSymbols = [...spec.symbols];
      const [movedItem] = newSymbols.splice(draggedIdx, 1);
      newSymbols.splice(targetIdx, 0, movedItem);
      onUpdateCode?.(stringifySpec({ ...spec, symbols: newSymbols }), true);
      if (isDraggedSelected) onSetSelection?.([targetIdx]);
    }

    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  const handleGridResizeApply = () => {
    if (!code || !onResize) return;
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    if (isNaN(w) || isNaN(h) || w < 2 || h < 2 || w > 100 || h > 100) return;
    if (w === spec.gridWidth && h === spec.gridHeight) return;

    const lines = code.split('\n');
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('(') && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        return resizeGrid(trimmed, w, h);
      }
      return line;
    });
    onResize(newLines.join('\n'));
    setGridResizeOpen(false);
  };

  const gridResizeChanged = spec && (parseInt(newWidth, 10) !== spec.gridWidth || parseInt(newHeight, 10) !== spec.gridHeight);
  const gridResizeValid = (() => {
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    return !isNaN(w) && !isNaN(h) && w >= 2 && h >= 2 && w <= 100 && h <= 100;
  })();

  return (
    <div className="space-y-4">
      <div className="panel-header">Specification Analysis</div>

      {/* Grid Size with inline resize */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Grid Size</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-primary">
              {spec.gridWidth} × {spec.gridHeight} = {spec.gridWidth * spec.gridHeight} cells
            </span>
            {code && onResize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setGridResizeOpen(!gridResizeOpen)}
                title="Resize Grid"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {gridResizeOpen && code && onResize && (
          <div className="p-2 rounded-md border border-primary/30 bg-background/95 backdrop-blur-sm space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground mb-1 block">W</Label>
                <Input type="number" min={2} max={100} value={newWidth} onChange={e => setNewWidth(e.target.value)} className="h-7 text-xs font-mono" />
              </div>
              <span className="text-muted-foreground pb-1">×</span>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground mb-1 block">H</Label>
                <Input type="number" min={2} max={100} value={newHeight} onChange={e => setNewHeight(e.target.value)} className="h-7 text-xs font-mono" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleGridResizeApply} disabled={!gridResizeChanged || !gridResizeValid}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGridResizeOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rotation Angle Step */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rotation Step</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-primary">{angleStep}°</span>
            {onAngleStepChange && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setAngleStepOpen(!angleStepOpen); setAngleStepInput(String(angleStep)); }}
                title="Edit Rotation Step"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {angleStepOpen && onAngleStepChange && (
          <div className="p-2 rounded-md border border-primary/30 bg-background/95 backdrop-blur-sm space-y-2">
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Step (1–180°)</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={angleStepInput}
                onChange={e => setAngleStepInput(e.target.value)}
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const v = parseInt(angleStepInput, 10);
                  if (!isNaN(v) && v >= 1 && v <= 180) {
                    onAngleStepChange(v);
                    setAngleStepOpen(false);
                  }
                }}
              >
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAngleStepOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {spec.symbols.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Symbols ({spec.symbols.length})
          </div>

          <div className="space-y-2">
            {spec.symbols.map((symbol, idx) => {
              const startCoords = linearToCoords(symbol.start, spec.gridWidth);
              const endCoords = linearToCoords(symbol.end, spec.gridWidth);
              const rect = getRect(symbol.start, symbol.end, spec.gridWidth);
              const width = rect.x2 - rect.x1 + 1;
              const height = rect.y2 - rect.y1 + 1;
              const color = COLORS[idx % COLORS.length];

              const isSelected = selectionSet.includes(idx);
              const isLocked = lockedSet.includes(idx);
              const isHidden = hiddenSet.includes(idx);

              return (
                <div
                  key={`${idx}-${symbol.char}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => { setDraggedIdx(null); setDropTargetIdx(null); }}
                  className={cn(
                    "p-2 rounded-md border transition-all duration-200 relative group",
                    isSelected ? "spec-item-selected" : "bg-secondary/50 border-border",
                    isLocked ? "spec-item-locked" : "",
                    isHidden ? "spec-item-hidden" : "",
                    dropTargetIdx === idx && "border-t-4 border-t-primary pt-1",
                    draggedIdx === idx && "opacity-50",
                    draggedIdx !== null && selectionSet.includes(draggedIdx) && isSelected && draggedIdx !== idx && "opacity-30"
                  )}
                  onDoubleClick={() => onToggleSelection?.(idx)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 p-0 font-mono text-xs"
                      onClick={() => {
                        setEditingIdx(idx);
                        setEditZIndex(idx.toString());
                      }}
                    >
                      {idx}
                    </Button>
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-lg"
                      style={{
                        backgroundColor: color.replace(')', ', 0.2)').replace('hsl', 'hsla'),
                        color: isLocked ? 'hsl(0, 84%, 60%)' : color,
                        transform: `${symbol.flip === 'h' || symbol.flip === 'hv' ? 'scaleX(-1)' : ''} ${symbol.flip === 'v' || symbol.flip === 'hv' ? 'scaleY(-1)' : ''} rotate(${symbol.rotate || 0}deg)`,
                      }}
                    >
                      {symbol.char}
                    </span>
                    <span className="font-mono text-sm text-foreground">"{symbol.char}"</span>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => onToggleSelection?.(idx)}
                        className={cn("p-1 rounded hover:bg-muted", isSelected ? "text-primary" : "text-muted-foreground")}
                        title="Select"
                      >
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onToggleLock?.(idx)}
                        className={cn("p-1 rounded hover:bg-muted lock-toggle", isLocked ? "text-destructive" : "text-muted-foreground")}
                        title="Lock"
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onToggleHidden?.(idx)}
                        className={cn("p-1 rounded hover:bg-muted", isHidden ? "text-muted-foreground" : "text-primary")}
                        title="Hide"
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(idx)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingIdx === idx && (
                    <div className="mt-2 p-2 rounded-md border border-primary/30 bg-background/95 backdrop-blur-sm flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Layer Settings</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingIdx(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground">Layer (l=)</label>
                          <Input size={1} className="h-7 text-xs" value={editLayer} onChange={e => setEditLayer(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground">Z-Index (z=)</label>
                          <Input size={1} className="h-7 text-xs" value={editZIndex} onChange={e => setEditZIndex(e.target.value)} />
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleApplySettings(idx)}>Apply</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-muted-foreground">
                      Start: <span className="text-foreground font-mono">{symbol.start}</span>
                      <span className="text-muted-foreground/60 ml-1">({startCoords.x},{startCoords.y})</span>
                    </div>
                    <div className="text-muted-foreground">
                      End: <span className="text-foreground font-mono">{symbol.end}</span>
                      <span className="text-muted-foreground/60 ml-1">({endCoords.x},{endCoords.y})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
