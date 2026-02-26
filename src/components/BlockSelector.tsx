import React from 'react';
import { ParsedBlock } from '@/lib/unicomp-parser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface BlockSelectorProps {
  blocks: ParsedBlock[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const BlockSelector: React.FC<BlockSelectorProps> = ({
  blocks,
  selectedIndex,
  onSelect,
}) => {
  const { t } = useLocale();
  
  if (blocks.length === 0) return null;

  const getBlockLabel = (block: ParsedBlock): string => {
    if (block.name) return block.name;
    return `${t.defaultBlockName} ${block.lineNumber}`;
  };

  const validCount = blocks.filter(b => b.result.success).length;
  const errorCount = blocks.length - validCount;

  return (
    <div className="space-y-3">
      <div className="panel-header flex items-center justify-between">
        <span>{t.selectBlock}</span>
        <div className="flex items-center gap-2 text-xs font-normal">
          <span className="text-[hsl(var(--success))]">{validCount} {t.validBlocks}</span>
          {errorCount > 0 && (
            <span className="text-destructive">{errorCount} {t.errorBlocks}</span>
          )}
        </div>
      </div>

      <Select
        value={String(selectedIndex)}
        onValueChange={(val) => onSelect(parseInt(val, 10))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t.selectBlock} />
        </SelectTrigger>
        <SelectContent>
          {blocks.map((block, index) => (
            <SelectItem key={index} value={String(index)}>
              <div className="flex items-center gap-2 w-full">
                {block.result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{getBlockLabel(block)}</span>
                {block.result.success && (
                  <span className="text-xs text-muted-foreground">
                    {block.result.spec.gridWidth}×{block.result.spec.gridHeight}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {blocks[selectedIndex] && (
        <div className="text-xs font-mono bg-muted/50 p-2 rounded border border-border/50 truncate">
          {blocks[selectedIndex].raw}
        </div>
      )}
    </div>
  );
};
