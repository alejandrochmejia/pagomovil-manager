import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  useBackButtonClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal a document.body: el lightbox usa position:fixed, pero si se renderiza
  // dentro de un ancestro con `transform`/`will-change: transform` (p. ej. el
  // wrapper de PageTransition al abrirlo desde la lista de Pagos), ese ancestro
  // pasa a ser su bloque contenedor y `inset: 0` se resuelve contra el alto total
  // de la página en vez del viewport. Eso lo dejaba anclado arriba del scroll en
  // Android. Sacándolo al body queda siempre fijo al viewport.
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.close} onClick={onClose} aria-label="Cerrar">
        <IconX size={24} stroke={2} />
      </button>
      <img
        src={src}
        alt={alt}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
