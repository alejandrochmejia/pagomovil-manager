import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Captura errores de render en todo el árbol y muestra una pantalla de
 * recuperación en vez de dejar el WebView en blanco. `componentDidCatch` es el
 * punto natural para enganchar un servicio de error tracking (Sentry, etc.).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.icon}>
            <IconAlertTriangle size={48} stroke={1.5} />
          </div>
          <h1 className={styles.title}>Algo salió mal</h1>
          <p className={styles.description}>
            Ocurrió un error inesperado. Intenta recargar la aplicación.
          </p>
          <button type="button" className={styles.button} onClick={this.handleReload}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
