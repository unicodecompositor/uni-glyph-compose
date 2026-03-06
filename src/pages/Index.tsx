import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import '@/selection.css';
import { Header } from '@/components/Header';
import { UniCompEditor } from '@/components/UniCompEditor';
import { ExamplePresets } from '@/components/ExamplePresets';
import { SpecificationPanel } from '@/components/SpecificationPanel';
import { FormatReference } from '@/components/FormatReference';
import { GridVisualizationPanel } from '@/components/GridVisualizationPanel';
import { BlockSelector } from '@/components/BlockSelector';
import { parseUniComp, parseMultiLine, getRect, stringifySpec } from '@/lib/unicomp-parser';
import { useLocaleProvider } from '@/hooks/useLocale';
import { useHistory } from '@/hooks/useHistory';
import { Layers, PanelRightClose, PanelRightOpen, LayoutGrid, Grid, Hash, Eye, Download, Undo2, Redo2, Copy, ClipboardPaste, Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_CODE = '(30×15):H5-98;"2"67-99;C8-101;—11-104;C14-107;H16-109;"3"78-110;C166-259;H168-261;"3"230-262;"|"[r=115]189-284;"|"[r=65]186-281;"|"[r=0]69-251;"|"[r=115]336-431;"|"[r=65]339-434;"|"[r=65]192-287;"|"[r=115]183-278;"|"[r=65]180-275;"|"[r=115]330-425;"|"[r=65]333-428;"|"[r=0]210-392;"|"[r=0]215-397;"|"[r=0]216-398;"|"[r=0]222-404;"|"[r=65]210-276;"|"[r=115]330-396;"|"[r=115]218-284;"|"[r=65]338-404';

type LayoutMode = 'normal' | 'split' | 'fullscreen';

const IndexContent: React.FC = () => {
  const history = useHistory(DEFAULT_CODE);
  const code = history.current;
  const [deferredCode, setDeferredCode] = useState(DEFAULT_CODE);
  const [showGrid, setShowGrid] = useState(true);
  const [showIndices, setShowIndices] = useState(false);
  const [containerSize, setContainerSize] = useState(400);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal');
  const [specPanelVisible, setSpecPanelVisible] = useState(true);
  const [angleStep, setAngleStep] = useState(10);
  const [fullscreenViewMode, setFullscreenViewMode] = useState<'edit' | 'preview'>('edit');

  const [selectionSet, setSelectionSet] = useState<number[]>([]);
  const [lockedSet, setLockedSet] = useState<number[]>([]);
  const [hiddenSet, setHiddenSet] = useState<number[]>([]);
  const [clipboardLayers, setClipboardLayers] = useState<any[]>([]);

  const resetAllSets = useCallback(() => {
    setSelectionSet([]);
    setLockedSet([]);
    setHiddenSet([]);
  }, []);

  const handleCodeChange = useCallback((val: string) => {
    history.push(val);
    setDeferredCode(val);
    resetAllSets();
  }, [history, resetAllSets]);

  const handleUndo = useCallback(() => {
    const val = history.undo();
    if (val !== null) {
      setDeferredCode(val);
      resetAllSets();
    }
  }, [history, resetAllSets]);

  const handleRedo = useCallback(() => {
    const val = history.redo();
    if (val !== null) {
      setDeferredCode(val);
      resetAllSets();
    }
  }, [history, resetAllSets]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { parseResult, multiLineResult, spec } = useMemo(() => {
    const hasMultipleLines = code.includes('\n');
    if (hasMultipleLines) {
      const multiResult = parseMultiLine(code);
      const selectedBlock = multiResult.blocks[selectedBlockIndex] || multiResult.blocks[0];
      const currentSpec = selectedBlock?.result?.success ? selectedBlock.result.spec : null;
      return { parseResult: selectedBlock?.result || null, multiLineResult: multiResult, spec: currentSpec };
    } else {
      const result = parseUniComp(code);
      return { parseResult: result, multiLineResult: null, spec: result.success ? result.spec : null };
    }
  }, [code, selectedBlockIndex]);

  const deferredSpec = useMemo(() => {
    const hasMultipleLines = deferredCode.includes('\n');
    if (hasMultipleLines) {
      const multiResult = parseMultiLine(deferredCode);
      const selectedBlock = multiResult.blocks[selectedBlockIndex] || multiResult.blocks[0];
      return selectedBlock?.result?.success ? selectedBlock.result.spec : null;
    }
    const result = parseUniComp(deferredCode);
    return result.success ? result.spec : null;
  }, [deferredCode, selectedBlockIndex]);

  const handleUpdateCode = useCallback((newRuleCode: string, isFinal: boolean) => {
    const hasMultipleLines = code.includes('\n');

    if (hasMultipleLines && multiLineResult) {
      const currentBlock = multiLineResult.blocks[selectedBlockIndex] || multiLineResult.blocks[0];
      if (currentBlock) {
        const lines = code.split('\n');
        const lineIdx = currentBlock.lineNumber - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          lines[lineIdx] = newRuleCode;
          const fullCode = lines.join('\n');
          if (isFinal) {
            history.push(fullCode);
            setDeferredCode(fullCode);
          } else {
            history.setLive(fullCode);
          }
          return;
        }
      }
    }

    if (isFinal) {
      history.push(newRuleCode);
      setDeferredCode(newRuleCode);
    } else {
      history.setLive(newRuleCode);
    }
  }, [code, multiLineResult, selectedBlockIndex, history]);

  const toggleSelection = useCallback((index: number) => {
    if (lockedSet.includes(index)) return;
    setSelectionSet(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  }, [lockedSet]);

  const toggleLock = useCallback((index: number) => {
    setLockedSet(prev => {
      const isLocked = prev.includes(index);
      if (!isLocked) {
        setSelectionSet(s => s.filter(i => i !== index));
        return [...prev, index];
      } else return prev.filter(i => i !== index);
    });
  }, []);

  const toggleHidden = useCallback((index: number) => {
    setHiddenSet(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  }, []);

  const handleCellDoubleClick = useCallback((cellIndex: number) => {
    if (!spec) return;
    const coveringSymbols = spec.symbols
      .map((s, i) => ({ symbol: s, index: i }))
      .filter(({ symbol }) => {
        const rect = getRect(symbol.start, symbol.end, spec.gridWidth);
        const x = cellIndex % spec.gridWidth;
        const y = Math.floor(cellIndex / spec.gridWidth);
        return x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
      })
      .reverse();
    if (coveringSymbols.length === 0) return;
    let target = coveringSymbols.find(s => !lockedSet.includes(s.index));
    if (!target) target = coveringSymbols[0];
    if (target) toggleSelection(target.index);
  }, [spec, lockedSet, toggleSelection]);

  const handleCopyLayers = useCallback(() => {
    if (!spec || selectionSet.length === 0) return;
    const copied = selectionSet
      .map(idx => spec.symbols[idx])
      .filter(Boolean)
      .map(s => JSON.parse(JSON.stringify(s)));
    setClipboardLayers(copied);
  }, [spec, selectionSet]);

  const handlePasteLayers = useCallback(() => {
    if (clipboardLayers.length === 0 || !spec) return;
    const newSpec = JSON.parse(JSON.stringify(spec));
    const startIdx = newSpec.symbols.length;
    newSpec.symbols.push(...clipboardLayers.map((s: any) => ({ ...s })));
    const newCode = stringifySpec(newSpec);
    handleCodeChange(newCode);
    const newSelection = clipboardLayers.map((_: any, i: number) => startIdx + i);
    setSelectionSet(newSelection);
  }, [clipboardLayers, spec, handleCodeChange]);

  const handleSave = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unicomp-rule.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.unicomp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        handleCodeChange(text);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleCodeChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectionSet.length > 0) {
        handleCopyLayers();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardLayers.length > 0) {
        handlePasteLayers();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleCopyLayers, handlePasteLayers, selectionSet, clipboardLayers]);

  useEffect(() => {
    if (multiLineResult && selectedBlockIndex >= multiLineResult.blocks.length) setSelectedBlockIndex(0);
  }, [multiLineResult, selectedBlockIndex]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const maxSize = layoutMode === 'fullscreen' ? 800 : layoutMode === 'split' ? 700 : 600;
        const size = Math.min(width - 32, height - 80, maxSize);
        setContainerSize(Math.max(200, Math.floor(size)));
      }
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [layoutMode]);

  const cycleLayoutMode = useCallback(() => {
    setLayoutMode(prev => {
      if (prev === 'normal') return 'split';
      if (prev === 'split') { setSpecPanelVisible(true); return 'fullscreen'; }
      setFullscreenViewMode('edit');
      return 'normal';
    });
  }, []);

  const specPanel = (
    <SpecificationPanel
      spec={spec}
      selectionSet={selectionSet}
      lockedSet={lockedSet}
      hiddenSet={hiddenSet}
      onToggleSelection={toggleSelection}
      onToggleLock={toggleLock}
      onToggleHidden={toggleHidden}
      onUpdateCode={handleUpdateCode}
      onSetSelection={setSelectionSet}
      onRemoveFromSets={(idx: number) => {
        setSelectionSet(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
        setLockedSet(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
        setHiddenSet(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
      }}
      code={code}
      onResize={handleCodeChange}
      angleStep={angleStep}
      onAngleStepChange={setAngleStep}
    />
  );

  const gridPanel = (mode: LayoutMode) => (
    <GridVisualizationPanel
      spec={spec}
      deferredSpec={deferredSpec}
      showGrid={showGrid}
      showIndices={showIndices}
      containerSize={containerSize}
      selectionSet={selectionSet}
      lockedSet={lockedSet}
      hiddenSet={hiddenSet}
      onToggleGrid={() => setShowGrid(v => !v)}
      onToggleIndices={() => setShowIndices(v => !v)}
      onCycleLayoutMode={cycleLayoutMode}
      onCellDoubleClick={handleCellDoubleClick}
      onUpdateCode={handleUpdateCode}
      onTripleTapEmpty={resetAllSets}
      angleStep={angleStep}
      canvasContainerRef={canvasContainerRef}
      layoutMode={mode}
    />
  );

  const leftToolbar = (position: 'fixed' | 'absolute' = 'absolute') => (
    <div className={cn(
      position === 'fixed' ? "fixed top-20 left-4 z-40" : "absolute top-2 left-2 z-40",
      "flex flex-col items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border p-1 shadow-lg"
    )}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave} title="Save (Download)">
        <Save className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLoad} title="Load (Open file)">
        <FolderOpen className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={!history.canRedo} title="Redo (Ctrl+Y)">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLayers} disabled={selectionSet.length === 0} title="Copy layers (Ctrl+C)">
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePasteLayers} disabled={clipboardLayers.length === 0} title="Paste layers (Ctrl+V)">
        <ClipboardPaste className="h-4 w-4" />
      </Button>
    </div>
  );

  // --- NORMAL MODE ---
  if (layoutMode === 'normal') {
    return (
      <div className="min-h-screen bg-background relative">
        <Header canUndo={history.canUndo} canRedo={history.canRedo} onUndo={handleUndo} onRedo={handleRedo} />
        {leftToolbar('fixed')}
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Editor & Presets */}
            <div className="lg:col-span-4 space-y-4">
              <div className="panel">
                <UniCompEditor value={code} onChange={handleCodeChange} parseResult={parseResult} multiLineResult={multiLineResult} selectedBlockIndex={selectedBlockIndex} />
              </div>
              {multiLineResult && multiLineResult.blocks.length > 1 && (
                <div className="panel">
                  <BlockSelector blocks={multiLineResult.blocks} selectedIndex={selectedBlockIndex} onSelect={(idx) => { setSelectedBlockIndex(idx); resetAllSets(); }} />
                </div>
              )}
              <div className="panel">
                <ExamplePresets onSelect={handleCodeChange} currentCode={code} />
              </div>
              <div className="panel">
                <FormatReference />
              </div>
            </div>

            {/* Middle Column: Grid Visualization */}
            <div className="lg:col-span-5">
              <div className="panel flex flex-col items-center relative min-h-[400px]">
                {gridPanel('normal')}
              </div>
            </div>

            {/* Right Column: Spec Analysis */}
            <div className="lg:col-span-3 space-y-4">
              <div className="panel max-h-[800px] overflow-y-auto">
                {specPanel}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- SPLIT MODE ---
  if (layoutMode === 'split') {
    return (
      <div className="min-h-screen bg-background relative">
        <Header canUndo={history.canUndo} canRedo={history.canRedo} onUndo={handleUndo} onRedo={handleRedo} />
        {leftToolbar('fixed')}
        <main className="container mx-auto px-4 py-4">
          <div className={cn(
            "grid gap-4",
            specPanelVisible ? "grid-cols-1 lg:grid-cols-10" : "grid-cols-1"
          )}>
            <div className={cn(specPanelVisible ? "lg:col-span-7" : "lg:col-span-1")}>
              <div className="panel flex flex-col items-center relative min-h-[400px]">
                <GridVisualizationPanel
                  spec={spec}
                  deferredSpec={deferredSpec}
                  showGrid={showGrid}
                  showIndices={showIndices}
                  containerSize={containerSize}
                  selectionSet={selectionSet}
                  lockedSet={lockedSet}
                  hiddenSet={hiddenSet}
                  onToggleGrid={() => setShowGrid(v => !v)}
                  onToggleIndices={() => setShowIndices(v => !v)}
                  onCycleLayoutMode={cycleLayoutMode}
                  onCellDoubleClick={handleCellDoubleClick}
                  onUpdateCode={handleUpdateCode}
                  onTripleTapEmpty={resetAllSets}
                  angleStep={angleStep}
                  canvasContainerRef={canvasContainerRef}
                  layoutMode="split"
                  extraToolbar={
                    !specPanelVisible ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSpecPanelVisible(true)} title="Show Specification">
                        <PanelRightOpen className="h-4 w-4" />
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            </div>

            {specPanelVisible && (
              <div className="lg:col-span-3 space-y-4">
                <div className="panel max-h-[calc(100vh-120px)] overflow-y-auto relative">
                  <Button
                    variant="ghost" size="icon"
                    className="absolute top-2 right-2 h-7 w-7 z-10"
                    onClick={() => setSpecPanelVisible(false)}
                    title="Hide panel"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                  {specPanel}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- FULLSCREEN MODE ---
  // Handle export in fullscreen
  const handleFullscreenExport = () => {
    const gridVizRef = document.querySelector('[data-grid-viz-export]');
    if (gridVizRef) (gridVizRef as HTMLButtonElement).click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header canUndo={history.canUndo} canRedo={history.canRedo} onUndo={handleUndo} onRedo={handleRedo} />
      {leftToolbar('fixed')}
      {/* Floating toolbar top-right under header — all 6 buttons */}
      <div className="fixed top-20 right-4 z-40 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border p-1 shadow-lg">
        {/* 1. Layout mode toggle */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8"
          onClick={() => setLayoutMode('normal')}
          title="Back to normal mode"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        {/* 2. Layers panel toggle */}
        <Button
          variant="ghost" size="icon"
          className={cn("h-8 w-8", specPanelVisible && "text-primary")}
          onClick={() => setSpecPanelVisible(prev => !prev)}
          title="Toggle Specification"
        >
          <Layers className="h-4 w-4" />
        </Button>
        {/* 3. Export */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8"
          onClick={handleFullscreenExport}
          disabled={!deferredSpec}
          title="Export as HTML Canvas"
        >
          <Download className="h-4 w-4" />
        </Button>
        {/* 4. Edit/Preview toggle */}
        <Button
          variant="ghost" size="icon"
          className={cn("h-8 w-8", fullscreenViewMode === 'preview' && "text-primary")}
          onClick={() => setFullscreenViewMode(v => v === 'edit' ? 'preview' : 'edit')}
          title={fullscreenViewMode === 'edit' ? 'Switch to Result Preview' : 'Switch to Edit Mode'}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {/* 5. Show indices */}
        <Button
          variant="ghost" size="icon"
          className={cn("h-8 w-8", showIndices && "text-primary")}
          onClick={() => setShowIndices(v => !v)}
          title="Toggle Indices"
        >
          <Hash className="h-4 w-4" />
        </Button>
        {/* 6. Show grid */}
        <Button
          variant="ghost" size="icon"
          className={cn("h-8 w-8", showGrid && "text-primary")}
          onClick={() => setShowGrid(v => !v)}
          title="Toggle Grid"
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>

      <main className="flex-1 flex items-center justify-center relative" ref={canvasContainerRef}>
        <GridVisualizationPanel
          spec={spec}
          deferredSpec={deferredSpec}
          showGrid={showGrid}
          showIndices={showIndices}
          containerSize={containerSize}
          selectionSet={selectionSet}
          lockedSet={lockedSet}
          hiddenSet={hiddenSet}
          onToggleGrid={() => setShowGrid(v => !v)}
          onToggleIndices={() => setShowIndices(v => !v)}
          onCycleLayoutMode={cycleLayoutMode}
          onCellDoubleClick={handleCellDoubleClick}
          onUpdateCode={handleUpdateCode}
          onTripleTapEmpty={resetAllSets}
          angleStep={angleStep}
          layoutMode="fullscreen"
          fullscreenViewMode={fullscreenViewMode}
        />

        {/* Floating Spec Panel */}
        {specPanelVisible && (
          <div className="fixed top-28 right-4 z-30 w-80 max-h-[calc(100vh-140px)] overflow-y-auto panel shadow-2xl">
            <Button
              variant="ghost" size="icon"
              className="absolute top-2 right-2 h-7 w-7 z-10"
              onClick={() => setSpecPanelVisible(false)}
              title="Hide panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
            {specPanel}
          </div>
        )}
      </main>
    </div>
  );
};

const Index: React.FC = () => {
  const localeProviderValue = useLocaleProvider();
  return (
    <localeProviderValue.LocaleContext.Provider value={{
      locale: localeProviderValue.locale,
      setLocale: localeProviderValue.setLocale,
      t: localeProviderValue.t,
      locales: localeProviderValue.locales,
    }}>
      <IndexContent />
    </localeProviderValue.LocaleContext.Provider>
  );
};

export default Index;
