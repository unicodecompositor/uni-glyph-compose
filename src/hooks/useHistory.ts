import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 20;

interface HistoryState {
  past: string[];
  future: string[];
}

export function useHistory(initialValue: string) {
  const [current, setCurrent] = useState(initialValue);
  const historyRef = useRef<HistoryState>({ past: [], future: [] });
  const isUndoRedoRef = useRef(false);

  const push = useCallback((value: string) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      setCurrent(value);
      return;
    }
    
    setCurrent(prev => {
      if (prev === value) return prev;
      const h = historyRef.current;
      h.past = [...h.past, prev].slice(-MAX_HISTORY);
      h.future = []; // clear future on new change
      return value;
    });
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return null;
    
    const previous = h.past[h.past.length - 1];
    setCurrent(curr => {
      h.past = h.past.slice(0, -1);
      h.future = [curr, ...h.future].slice(0, MAX_HISTORY);
      isUndoRedoRef.current = true;
      return previous;
    });
    return previous;
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return null;
    
    const next = h.future[0];
    setCurrent(curr => {
      h.future = h.future.slice(1);
      h.past = [...h.past, curr].slice(-MAX_HISTORY);
      isUndoRedoRef.current = true;
      return next;
    });
    return next;
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  return { current, push, undo, redo, canUndo, canRedo, isUndoRedoRef };
}
