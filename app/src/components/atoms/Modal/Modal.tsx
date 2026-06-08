import { type ReactNode, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useBackButtonClose(isOpen, onClose);

  // Si algo durante el ciclo de apertura (pushState, layout reflow del portal,
  // WebView de Android) resetea el scrollTop del contenedor `.app-content`,
  // lo restauramos de forma defensiva tras el paint.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = document.querySelector('.app-content') as HTMLElement | null;
    if (!el) return;
    const savedTop = el.scrollTop;
    if (savedTop === 0) return;
    const restore = () => {
      if (el.scrollTop !== savedTop) el.scrollTop = savedTop;
    };
    const raf = requestAnimationFrame(() => {
      restore();
      // Segundo pase por si el reset ocurre después del primer paint
      // (WebView a veces lo hace en el siguiente frame).
      requestAnimationFrame(restore);
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            <IconX size={20} stroke={2} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
