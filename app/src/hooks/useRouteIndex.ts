import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useRouteIndex(routes: string[]) {
  const { pathname } = useLocation();
  const raw = routes.indexOf(pathname);
  const current = raw === -1 ? 0 : raw;

  const [indices, setIndices] = useState({ prev: current, current });

  if (indices.current !== current) {
    setIndices({ prev: indices.current, current });
  }

  const direction =
    current > indices.prev ? 'right' : current < indices.prev ? 'left' : 'none';

  return { index: current, prevIndex: indices.prev, direction } as const;
}
