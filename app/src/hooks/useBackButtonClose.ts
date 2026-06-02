import { useEffect } from 'react';

const STATE_KEY = '__overlay';

export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const marker = Symbol('overlay').toString();
    history.pushState({ ...(history.state ?? {}), [STATE_KEY]: marker }, '');

    const handlePop = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      if (history.state?.[STATE_KEY] === marker) {
        history.back();
      }
    };
  }, [isOpen, onClose]);
}
