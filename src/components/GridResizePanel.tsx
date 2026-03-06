import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Maximize2, RotateCcw } from 'lucide-react';
import { resizeGrid } from '@/lib/unicomp-parser';
import { useLocale } from '@/hooks/useLocale';

interface GridResizePanelProps {
  code: string;
  onResize: (newCode: string) => void;
  currentSpec?: { gridWidth: number; gridHeight: number } | null;
}

export const GridResizePanel: React.FC<GridResizePanelProps> = ({ code, onResize, currentSpec }) => {
  const { t } = useLocale();
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [currentWidth, setCurrentWidth] = useState<number | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  

  // Sync from currentSpec (selected block) when it changes
  useEffect(() => {
    if (currentSpec) {
      const { gridWidth, gridHeight } = currentSpec;
      setCurrentWidth(gridWidth);
      setCurrentHeight(gridHeight);
      setNewWidth(String(gridWidth));
      setNewHeight(String(gridHeight));
    }
  }, [currentSpec?.gridWidth, currentSpec?.gridHeight]);

  const handleApply = () => {
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    if (isNaN(w) || isNaN(h) || w < 2 || h < 2 || w > 100 || h > 100) return;
    if (w === currentWidth && h === currentHeight) return;

    // Handle multi-line: resize each rule line
    const lines = code.split('\n');
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('(') && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        return resizeGrid(trimmed, w, h);
      }
      return line;
    });

    const newCode = newLines.join('\n');
    onResize(newCode);
    onResize(newCode);
  };

  const handleReset = () => {
    if (currentWidth !== null) setNewWidth(String(currentWidth));
    if (currentHeight !== null) setNewHeight(String(currentHeight));
  };

  const isChanged = currentWidth !== null && currentHeight !== null &&
    (parseInt(newWidth, 10) !== currentWidth || parseInt(newHeight, 10) !== currentHeight);

  const isValid = (() => {
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    return !isNaN(w) && !isNaN(h) && w >= 2 && h >= 2 && w <= 100 && h <= 100;
  })();

  return (
    <div className="space-y-3">
      <div className="panel-header flex items-center gap-2">
        <Maximize2 className="w-3.5 h-3.5" />
        Grid Resize
      </div>

      {currentWidth !== null && (
        <div className="text-xs text-muted-foreground">
          Current: <span className="text-primary font-mono">{currentWidth}×{currentHeight}</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">W</Label>
          <Input
            type="number"
            min={2}
            max={100}
            value={newWidth}
            onChange={(e) => setNewWidth(e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
        <span className="text-muted-foreground pb-1.5">×</span>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">H</Label>
          <Input
            type="number"
            min={2}
            max={100}
            value={newHeight}
            onChange={(e) => setNewHeight(e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleApply}
          disabled={!isChanged || !isValid}
          className="flex-1 h-8 text-xs"
        >
          Apply Resize
        </Button>
        {isChanged && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-8 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {isChanged && isValid && (
        <p className="text-[10px] text-muted-foreground/70">
          ⚠️ Elements will keep their x,y positions. Elements outside new bounds will be clamped.
        </p>
      )}
    </div>
  );
};
