import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export function useNetworkStatus() {
  const [online, setOnline] = useState(
    () => Capacitor.isNativePlatform() || typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    let removed = false;
    let cleanup: (() => void) | null = null;

    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then((status) => {
        if (!removed) setOnline(status.connected);
      });

      const handlePromise = Network.addListener('networkStatusChange', (status) => {
        setOnline(status.connected);
      });

      cleanup = () => {
        handlePromise.then((h) => h.remove());
      };
    } else {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      removed = true;
      cleanup?.();
    };
  }, []);

  return online;
}
