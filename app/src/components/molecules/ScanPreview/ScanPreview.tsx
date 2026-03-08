import type { N8nScanResponse } from '@/types/common';
import type { Pago } from '@/types/pago';
import PagoForm from '@/components/molecules/PagoForm/PagoForm';
import styles from './ScanPreview.module.css';

interface ScanPreviewProps {
  imageBase64: string;
  scanResult: N8nScanResponse;
  onConfirm: (data: Omit<Pago, 'id' | 'creadoEn' | 'actualizadoEn'>) => void;
  onCancel: () => void;
}

export default function ScanPreview({
  imageBase64,
  scanResult,
  onConfirm,
  onCancel,
}: ScanPreviewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <img
          src={`data:image/jpeg;base64,${imageBase64}`}
          alt="Comprobante escaneado"
          className={styles.image}
        />
      </div>
      <div className={styles.formWrapper}>
        <h3 className={styles.title}>Verifica los datos</h3>
        <PagoForm
          initial={{
            monto: scanResult.monto,
            banco: scanResult.banco,
            cedula: scanResult.cedula,
            telefono: scanResult.telefono,
            referencia: scanResult.referencia,
            fecha: scanResult.fecha,
            hora: scanResult.hora,
            concepto: scanResult.concepto,
          }}
          onSubmit={onConfirm}
          onCancel={onCancel}
          submitLabel="Guardar pago"
        />
      </div>
    </div>
  );
}
