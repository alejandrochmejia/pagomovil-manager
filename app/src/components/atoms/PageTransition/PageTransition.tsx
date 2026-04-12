import { type ReactNode, useRef, useEffect } from 'react';
import styles from './PageTransition.module.css';

interface PageTransitionProps {
  routeKey: string;
  direction: 'left' | 'right' | 'none';
  children: ReactNode;
}

export default function PageTransition({ routeKey, direction, children }: PageTransitionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prevKey = useRef(routeKey);

  useEffect(() => {
    if (prevKey.current === routeKey) return;
    prevKey.current = routeKey;

    const el = wrapperRef.current;
    if (!el || direction === 'none') return;

    const cls = direction === 'right' ? styles.slideFromRight : styles.slideFromLeft;
    el.classList.add(cls);

    const onEnd = () => el.classList.remove(cls);
    el.addEventListener('animationend', onEnd, { once: true });
    return () => el.removeEventListener('animationend', onEnd);
  }, [routeKey, direction]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      {children}
    </div>
  );
}
