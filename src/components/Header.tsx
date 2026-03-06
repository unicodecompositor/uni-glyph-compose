import React from 'react';
import { Grid3X3, Layers, Sparkles, Undo2, Redo2 } from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ canUndo, canRedo, onUndo, onRedo }) => {
  const { t } = useLocale();
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-gradient">{t.appName}</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Undo/Redo */}
            {onUndo && onRedo && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span>{t.layerRendering}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span>{t.anySymbol}</span>
              </div>
            </div>
            
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
};
