import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureReceipt } from '@/services/camera.service';
import { scanReceipt, isScanConfigured } from '@/services/scan.service';
import { createPago } from '@/services/pago.service';
import type { ScanResponse } from '@/types/common';
import type { Pago } from '@/types/pago';
import { IconCamera, IconPencil, IconAlertTriangle } from '@tabler/icons-react';
import Button from '@/components/atoms/Button/Button';
import Modal from '@/components/atoms/Modal/Modal';
import Spinner from '@/components/atoms/Spinner/Spinner';
import PagoForm from '@/components/molecules/PagoForm/PagoForm';
import ScanPreview from '@/components/molecules/ScanPreview/ScanPreview';
import styles from './ScanPage.module.css';

type ScanState = 'idle' | 'capturing' | 'processing' | 'preview' | 'error';

export default function ScanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('idle');
  const [imageBase64, setImageBase64] = useState('');
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const scanConfigured = isScanConfigured();

  async function handleScan() {
    try {
      setState('capturing');
      const base64 = await captureReceipt();
      setImageBase64(base64);

      setState('processing');
      const result = await scanReceipt(base64);
      setScanResult(result);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setState('error');
    }
  }

  async function handleConfirm(data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) {
    await createPago({
      ...data,
      imagen_uri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
    });
    navigate('/pagos');
  }

  async function handleManualSubmit(data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) {
    await createPago(data);
    setShowManualForm(false);
    navigate('/pagos');
  }

  function handleReset() {
    setState('idle');
    setImageBase64('');
    setScanResult(null);
    setError('');
  }

  return (
    <div className="page">
      <h1>Registrar pago</h1>

      {!scanConfigured && state === 'idle' && (
        <div className={styles.warning}>
          Configura la URL del servidor de escaneo (VITE_SCAN_API_URL) en el archivo .env
        </div>
      )}

      {state === 'idle' && (
        <div className={styles.options}>
          <button className={styles.optionCard} onClick={handleScan} disabled={!scanConfigured}>
            <span className={styles.optionIcon}><IconCamera size={32} stroke={1.5} /></span>
            <span className={styles.optionTitle}>Escanear comprobante</span>
            <span className={styles.optionDesc}>
              Toma una foto y la IA extrae los datos automaticamente
            </span>
          </button>

          <button className={styles.optionCard} onClick={() => setShowManualForm(true)}>
            <span className={styles.optionIcon}><IconPencil size={32} stroke={1.5} /></span>
            <span className={styles.optionTitle}>Registro manual</span>
            <span className={styles.optionDesc}>
              Ingresa los datos del pago movil manualmente
            </span>
          </button>
        </div>
      )}

      {(state === 'capturing' || state === 'processing') && (
        <div className={styles.center}>
          <Spinner size="lg" />
          <p className={styles.hint}>
            {state === 'capturing' ? 'Capturando imagen...' : 'Procesando con IA...'}
          </p>
        </div>
      )}

      {state === 'preview' && scanResult && (
        <ScanPreview
          imageBase64={imageBase64}
          scanResult={scanResult}
          onConfirm={handleConfirm}
          onCancel={handleReset}
        />
      )}

      {state === 'error' && (
        <div className={styles.center}>
          <div className={styles.optionIcon}><IconAlertTriangle size={48} stroke={1.5} /></div>
          <p className={styles.errorText}>{error}</p>
          <div className={styles.errorActions}>
            <Button variant="secondary" onClick={handleReset}>Cancelar</Button>
            <Button onClick={handleScan}>Intentar de nuevo</Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showManualForm}
        onClose={() => setShowManualForm(false)}
        title="Registro manual"
      >
        <PagoForm
          onSubmit={handleManualSubmit}
          onCancel={() => setShowManualForm(false)}
          submitLabel="Registrar pago"
        />
      </Modal>
    </div>
  );
}
