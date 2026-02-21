import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { MultiLineParseResult, ErrorLine } from '@/lib/unicomp-parser';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  errorLines?: ErrorLine[];
  multiLineResult?: MultiLineParseResult | null;
  className?: string;
  placeholder?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  errorLines = [],
  multiLineResult,
  className,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const { lines, errorMap } = useMemo(() => {
    const splitLines = value.split('\n');
    const map = new Map<number, ErrorLine>();
    
    if (multiLineResult?.errorLines) {
      for (const err of multiLineResult.errorLines) {
        map.set(err.lineNumber, err);
      }
    }
    
    for (const err of errorLines) {
      map.set(err.lineNumber, err);
    }
    
    return { lines: splitLines, errorMap: map };
  }, [value, errorLines, multiLineResult]);

  // Measure wrapped line heights
  const measureLineHeights = useCallback(() => {
    if (!measureRef.current || !textareaRef.current) return;
    const measure = measureRef.current;
    const textarea = textareaRef.current;

    const cs = window.getComputedStyle(textarea);
    const contentWidth = textarea.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

    measure.style.width = `${contentWidth}px`;
    measure.style.font = cs.font;
    measure.style.lineHeight = cs.lineHeight;
    measure.style.letterSpacing = cs.letterSpacing;
    measure.style.whiteSpace = 'pre-wrap';
    measure.style.overflowWrap = 'break-word';
    measure.style.wordBreak = 'break-all';

    const heights: number[] = [];
    measure.innerHTML = '';

    for (const line of lines) {
      const div = document.createElement('div');
      div.style.whiteSpace = 'pre-wrap';
      div.style.overflowWrap = 'break-word';
      div.style.wordBreak = 'break-all';
      div.textContent = line || '\u00A0';
      measure.appendChild(div);
      heights.push(div.getBoundingClientRect().height);
    }

    measure.innerHTML = '';
    setLineHeights(heights);
  }, [lines]);

  useEffect(() => {
    measureLineHeights();

    if (!textareaRef.current) return;
    const ro = new ResizeObserver(() => measureLineHeights());
    ro.observe(textareaRef.current);
    return () => ro.disconnect();
  }, [measureLineHeights]);

  const handleScroll = () => {
    const scrollTop = textareaRef.current?.scrollTop || 0;
    
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(120, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div className={cn(
      'relative font-mono text-sm border border-border rounded-md overflow-hidden bg-muted/30',
      className
    )}>
      {/* Hidden measurement div */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute top-0 left-0 pointer-events-none invisible overflow-hidden"
        style={{ zIndex: -1 }}
      />

      <div className="flex relative">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 select-none overflow-hidden bg-muted/50 border-r border-border"
          style={{ width: '3rem' }}
        >
          <div className="py-2">
            {lines.map((_, index) => {
              const lineNum = index + 1;
              const hasError = errorMap.has(lineNum);
              const h = lineHeights[index] || 24;
              
              return (
                <div
                  key={lineNum}
                  className={cn(
                    'px-2 text-right text-xs leading-6 transition-colors flex items-start justify-end',
                    hasError
                      ? 'bg-destructive/20 text-destructive font-medium'
                      : 'text-muted-foreground'
                  )}
                  style={{ height: h }}
                >
                  {lineNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Error highlight overlay */}
          <div 
            ref={highlightRef}
            className="absolute inset-0 pointer-events-none py-2 px-3 overflow-hidden"
            aria-hidden="true"
          >
            <div className="relative">
              {lines.map((lineContent, index) => {
                const lineNum = index + 1;
                const error = errorMap.get(lineNum);
                const h = lineHeights[index] || 24;
                
                return (
                  <div 
                    key={lineNum} 
                    className="relative"
                    style={{ height: h, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-all', fontFamily: 'inherit' }}
                  >
                    {error && (
                      <div className="absolute inset-0 bg-destructive/15 rounded-sm" />
                    )}
                    <span className="invisible">{lineContent || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            wrap="soft"
            placeholder={placeholder || '(5):F5-24;→0-9 or (10×3):F15-17 for rectangular grid'}
            className={cn(
              'w-full min-h-[120px] py-2 px-3 resize-none',
              'bg-transparent text-foreground leading-6',
              'focus:outline-none focus:ring-0',
              'font-mono text-sm',
              'placeholder:text-muted-foreground/50',
              'relative z-10',
              'whitespace-pre-wrap break-all'
            )}
            style={{
              caretColor: 'hsl(var(--primary))',
              lineHeight: '1.5rem',
            }}
          />
        </div>
      </div>

      {/* Error messages */}
      {errorMap.size > 0 && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 space-y-1">
          {Array.from(errorMap.values()).slice(0, 3).map((error, i) => (
            <div key={i} className="text-xs text-destructive flex items-start gap-1.5">
              <span className="font-medium whitespace-nowrap">
                Ln {error.lineNumber}{error.column ? `, Col ${error.column}` : ''}:
              </span>
              <span className="opacity-90 break-words">{error.message}</span>
            </div>
          ))}
          {errorMap.size > 3 && (
            <div className="text-xs text-destructive/70 mt-1">
              +{errorMap.size - 3} more error{errorMap.size - 3 > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
