import { useState, useCallback, useEffect } from "react";

interface SequenceAction {
  type: "cursor_move" | "cursor_click" | "cursor_hover" | "subtitle" | "wait" | "callback";
  target?: string | { x: number; y: number };
  text?: string;
  duration?: number;
  callback?: () => void;
}

interface Sequence {
  id: string;
  actions: SequenceAction[];
}

interface UseCinematicSequenceProps {
  sequences: Sequence[];
  onSequenceChange?: (sequenceId: string) => void;
  onComplete?: () => void;
}

interface CinematicState {
  currentSequenceIndex: number;
  currentActionIndex: number;
  cursorPosition: { x: number; y: number };
  isClicking: boolean;
  isHovering: boolean;
  currentSubtitle: string;
  isPlaying: boolean;
  focusPosition: { x: number; y: number; radius?: number } | null;
}

export function useCinematicSequence({
  sequences,
  onSequenceChange,
  onComplete,
}: UseCinematicSequenceProps) {
  const [state, setState] = useState<CinematicState>({
    currentSequenceIndex: 0,
    currentActionIndex: 0,
    cursorPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    isClicking: false,
    isHovering: false,
    currentSubtitle: "",
    isPlaying: false,
    focusPosition: null,
  });

  const getElementPosition = useCallback((selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      };
    }
    return null;
  }, []);

  const executeAction = useCallback(async (action: SequenceAction): Promise<void> => {
    return new Promise((resolve) => {
      switch (action.type) {
        case "cursor_move": {
          let targetPos: { x: number; y: number };
          
          if (typeof action.target === "string") {
            const pos = getElementPosition(action.target);
            targetPos = pos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          } else {
            targetPos = action.target || { x: 0, y: 0 };
          }

          setState(prev => ({
            ...prev,
            cursorPosition: targetPos,
            focusPosition: { ...targetPos, radius: 60 },
            isHovering: false,
            isClicking: false,
          }));

          setTimeout(resolve, action.duration || 800);
          break;
        }

        case "cursor_click": {
          setState(prev => ({ ...prev, isClicking: true }));
          setTimeout(() => {
            setState(prev => ({ ...prev, isClicking: false }));
            action.callback?.();
            resolve();
          }, 300);
          break;
        }

        case "cursor_hover": {
          setState(prev => ({ ...prev, isHovering: true }));
          setTimeout(() => {
            setState(prev => ({ ...prev, isHovering: false }));
            resolve();
          }, action.duration || 1000);
          break;
        }

        case "subtitle": {
          setState(prev => ({ ...prev, currentSubtitle: action.text || "" }));
          setTimeout(resolve, action.duration || 3000);
          break;
        }

        case "wait": {
          setTimeout(resolve, action.duration || 1000);
          break;
        }

        case "callback": {
          action.callback?.();
          setTimeout(resolve, action.duration || 100);
          break;
        }

        default:
          resolve();
      }
    });
  }, [getElementPosition]);

  const playSequence = useCallback(async (sequenceIndex: number) => {
    if (sequenceIndex >= sequences.length) {
      setState(prev => ({ ...prev, isPlaying: false }));
      onComplete?.();
      return;
    }

    const sequence = sequences[sequenceIndex];
    onSequenceChange?.(sequence.id);

    setState(prev => ({
      ...prev,
      currentSequenceIndex: sequenceIndex,
      currentActionIndex: 0,
      isPlaying: true,
    }));

    for (let i = 0; i < sequence.actions.length; i++) {
      setState(prev => ({ ...prev, currentActionIndex: i }));
      await executeAction(sequence.actions[i]);
    }

    // Move to next sequence
    playSequence(sequenceIndex + 1);
  }, [sequences, executeAction, onSequenceChange, onComplete]);

  const start = useCallback(() => {
    playSequence(0);
  }, [playSequence]);

  const skip = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false, currentSubtitle: "" }));
    onComplete?.();
  }, [onComplete]);

  const reset = useCallback(() => {
    setState({
      currentSequenceIndex: 0,
      currentActionIndex: 0,
      cursorPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      isClicking: false,
      isHovering: false,
      currentSubtitle: "",
      isPlaying: false,
      focusPosition: null,
    });
  }, []);

  return {
    ...state,
    start,
    skip,
    reset,
    currentSequence: sequences[state.currentSequenceIndex],
  };
}
