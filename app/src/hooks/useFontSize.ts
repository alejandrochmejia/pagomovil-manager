import { useState, useEffect, useCallback } from 'react';

type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'pagomovil_font_size';

function getStoredFontSize(): FontSize {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored;
  return 'medium';
}

function applyFontSize(size: FontSize) {
  document.documentElement.setAttribute('data-font-size', size);
}

export function initFontSize() {
  applyFontSize(getStoredFontSize());
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>(getStoredFontSize);

  const setFontSize = useCallback((next: FontSize) => {
    localStorage.setItem(STORAGE_KEY, next);
    setFontSizeState(next);
    applyFontSize(next);
  }, []);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  return { fontSize, setFontSize } as const;
}
