import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Grid, Hash } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface ControlsPanelProps {
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
  showIndices: boolean;
  onShowIndicesChange: (value: boolean) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  showGrid,
  onShowGridChange,
  showIndices,
  onShowIndicesChange,
}) => {
  const { t } = useLocale();
  
  return (
    <div className="space-y-4">
      <div className="panel-header">Display Settings</div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-grid" className="flex items-center gap-2 text-sm cursor-pointer">
            <Grid className="w-4 h-4 text-muted-foreground" />
            {t.showGrid}
          </Label>
          <Switch id="show-grid" checked={showGrid} onCheckedChange={onShowGridChange} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-indices" className="flex items-center gap-2 text-sm cursor-pointer">
            <Hash className="w-4 h-4 text-muted-foreground" />
            {t.showIndices}
          </Label>
          <Switch id="show-indices" checked={showIndices} onCheckedChange={onShowIndicesChange} />
        </div>
      </div>
    </div>
  );
};
