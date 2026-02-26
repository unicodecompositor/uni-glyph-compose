import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ParseResult, MultiLineParseResult, ErrorLine } from '@/lib/unicomp-parser';
import { CodeEditor } from '@/components/CodeEditor';
import { ImportExportPanel } from '@/components/ImportExportPanel';
import { AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';

interface UniCompEditorProps {
  value: string;
  onChange: (value: string) => void;
  parseResult: ParseResult | null;
  multiLineResult?: MultiLineParseResult | null;
  selectedBlockIndex?: number;
}

export const UniCompEditor: React.FC<UniCompEditorProps> = ({
  value,
  onChange,
  parseResult,
  multiLineResult,
  selectedBlockIndex = 0,
}) => {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // FIX: Generate errorLines for single-line mode so CodeEditor can highlight them
  const singleLineErrors = useMemo((): ErrorLine[] => {
    // If multiLineResult exists, it handles its own errors
    if (multiLineResult) return [];
    
    if (parseResult && !parseResult.success && 'error' in parseResult) {
      const err = parseResult.error;
      return [{
        lineNumber: 1,
        column: err.column,
        message: err.message,
        raw: value,
      }];
    }
    return [];
  }, [parseResult, multiLineResult, value]);

  const hasMultipleBlocks = multiLineResult && multiLineResult.blocks.length > 1;
  const currentBlock = hasMultipleBlocks ? multiLineResult.blocks[selectedBlockIndex] : null;
  const currentResult = currentBlock ? currentBlock.result : parseResult;
  const isSuccess = currentResult?.success ?? false;
  const hasInput = value.trim().length > 0;
  const hasErrors = multiLineResult?.errorCount ? multiLineResult.errorCount > 0 : (!isSuccess && hasInput);

  const firstErrorMessage = useMemo(() => {
    if (multiLineResult?.errorLines?.[0]) {
      const err = multiLineResult.errorLines[0];
      return `${t.line} ${err.lineNumber}: ${err.message}`;
    }
    if (parseResult && !parseResult.success && 'error' in parseResult) {
      const err = parseResult.error;
      return err.line 
        ? `${t.line} ${err.line}: ${err.message}`
        : err.message;
    }
    return undefined;
  }, [multiLineResult, parseResult, t.line]);

  return (
    <div className="space-y-3">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{t.ruleEditor}</span>
          {hasInput && (
            hasErrors ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
            )
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={!hasInput}
          className="h-7 px-2 text-xs gap-1"
        >
          {copied ? (
            <><Check className="w-3 h-3" />{t.copied}</>
          ) : (
            <><Copy className="w-3 h-3" />{t.copy}</>
          )}
        </Button>
      </div>

      <CodeEditor
        value={value}
        onChange={onChange}
        errorLines={singleLineErrors}
        multiLineResult={multiLineResult}
        placeholder={t.editorPlaceholder}
      />

      <ImportExportPanel
        code={value}
        onImport={onChange}
        hasErrors={hasErrors}
        errorMessage={firstErrorMessage}
      />

      {currentResult?.success && currentResult.spec.symbols.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="text-primary">{currentResult.spec.gridWidth}×{currentResult.spec.gridHeight}</span> {t.gridSize.toLowerCase()} ·
          <span className="text-primary ml-1">{currentResult.spec.symbols.length}</span> {t.symbols.toLowerCase()}
          {hasMultipleBlocks && (
            <span className="ml-2">
              · {t.defaultBlockName} {selectedBlockIndex + 1} / {multiLineResult!.blocks.length}
            </span>
          )}
        </div>
      )}

      {hasMultipleBlocks && (
        <div className="text-[10px] text-muted-foreground/60 border-t border-border/50 pt-2">
          {multiLineResult!.validCount} {t.validBlocks}, {multiLineResult!.errorCount} {t.errorBlocks}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground/60 border-t border-border/50 pt-2 mt-2">
        💡 Formats: <code className="bg-muted/50 px-1 rounded">(N)</code> or <code className="bg-muted/50 px-1 rounded">(W×H)</code> · 
        Params: <code className="bg-muted/50 px-1 rounded">[n=name;id=x;class=y]</code> · 
        {t.comments}: <code className="bg-muted/50 px-1 rounded">#</code> <code className="bg-muted/50 px-1 rounded">//</code>
      </div>
    </div>
  );
};
