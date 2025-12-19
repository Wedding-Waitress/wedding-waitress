import { useState, useCallback, useEffect } from 'react';

interface MoveAction {
  guestId: string;
  guestName: string;
  previousTableId: string | null;
  previousTableNo: number | null;
  previousSeatNo: number | null;
  newTableId: string | null;
  timestamp: number;
}

interface UseUndoStackReturn {
  pushAction: (action: Omit<MoveAction, 'timestamp'>) => void;
  undo: () => MoveAction | null;
  canUndo: boolean;
  lastAction: MoveAction | null;
  clearStack: () => void;
}

const MAX_STACK_SIZE = 20;
const ACTION_EXPIRY_MS = 30000; // 30 seconds

export const useUndoStack = (): UseUndoStackReturn => {
  const [undoStack, setUndoStack] = useState<MoveAction[]>([]);

  // Clean up expired actions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoStack(stack => 
        stack.filter(action => now - action.timestamp < ACTION_EXPIRY_MS)
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const pushAction = useCallback((action: Omit<MoveAction, 'timestamp'>) => {
    const newAction: MoveAction = {
      ...action,
      timestamp: Date.now(),
    };
    
    setUndoStack(stack => {
      const newStack = [...stack, newAction];
      // Keep only the last MAX_STACK_SIZE actions
      if (newStack.length > MAX_STACK_SIZE) {
        return newStack.slice(-MAX_STACK_SIZE);
      }
      return newStack;
    });
  }, []);

  const undo = useCallback((): MoveAction | null => {
    let poppedAction: MoveAction | null = null;
    
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      poppedAction = stack[stack.length - 1];
      return stack.slice(0, -1);
    });
    
    return poppedAction;
  }, []);

  const clearStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  const canUndo = undoStack.length > 0;

  return {
    pushAction,
    undo,
    canUndo,
    lastAction,
    clearStack,
  };
};
