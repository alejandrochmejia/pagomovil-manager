import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { IconZoomIn, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ScanResponse } from '@/types/common';
import type { Pago, CuentaReceptora } from '@/types/pago';
import { formatCurrencyBs, toISODate } from '@/utils/format';
import {
  findMatchingCuenta,
  findClosestBanco,
  hasReceptorData,
  type ScanReceptor,
} from '@/utils/matchCuenta';
import { useCuentas } from '@/hooks/useCuentas';
import { createCuenta } from '@/services/cuenta.service';
import { checkDuplicatePago, type CheckDuplicateResponse } from '@/services/pago.service';
import {
  BANCOS,
  TIPOS_CEDULA,
  ESTADO_LABELS,
  ESTADOS_SELECCIONABLES,
  type EstadoPago,
} from '@/utils/constants';
import { isValidCedula } from '@/utils/validators';
import ImageLightbox from '@/components/atoms/ImageLightbox/ImageLightbox';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import Modal from '@/components/atoms/Modal/Modal';
import CuentaForm from '@/components/molecules/CuentaForm/CuentaForm';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './ScanPreview.module.css';

const bancoOptions = BANCOS.map((b) => ({ value: b.nombre, label: b.nombre }));

interface ScanPreviewProps {
  imageBase64: string;
  scanResult: ScanResponse;
  onConfirm: (data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) => void | Promise<void>;
  onCancel: () => void;
}

export default function ScanPreview({
  imageBase64,
  scanResult,
  onConfirm,
  onCancel,
}: ScanPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [monto, setMonto] = useState(scanResult.monto?.toString() ?? '');
  const [banco, setBanco] = useState(() => findClosestBanco(scanResult.banco));
  const [tipoCedula, setTipoCedula] = useState(() => {
    const raw = scanResult.cedula ?? '';
    return /^[VJEG]/i.test(raw) ? raw.charAt(0).toUpperCase() : 'V';
  });
  const [cedulaNum, setCedulaNum] = useState(() =>
    (scanResult.cedula ?? '').replace(/^[VJEG]/i, '').replace(/\D/g, ''),
  );
  const [referencia, setReferencia] = useState(scanResult.referencia ?? '');
  const [fecha, setFecha] = useState(scanResult.fecha ?? toISODate(new Date()));
  const [hora, setHora] = useState(scanResult.hora ?? '');
  const [concepto, setConcepto] = useState(scanResult.concepto ?? '');
  const [cuentaIdOverride, setCuentaIdOverride] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<EstadoPago>('confirmado');
  const [showCreateCuenta, setShowCreateCuenta] = useState(false);
  const [dupCheck, setDupCheck] = useState<CheckDuplicateResponse | null>(null);
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<
    Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'> | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { cuentas, refresh } = useCuentas();

  const receptor: ScanReceptor = useMemo(
    () => ({
      banco: scanResult.banco_destino,
      telefono: scanResult.telefono_destino,
      cedula: scanResult.cedula_destino,
    }),
    [scanResult.banco_destino, scanResult.telefono_destino, scanResult.cedula_destino],
  );

  const hasReceptor = hasReceptorData(receptor);

  const matchedCuenta = useMemo(
    () => (hasReceptor ? findMatchingCuenta(cuentas, receptor) : undefined),
    [cuentas, receptor, hasReceptor],
  );

  const cuentaId =
    cuentaIdOverride ?? (matchedCuenta?.id ? String(matchedCuenta.id) : '');

  const hasComision = !!scanResult.comision && scanResult.comision > 0;
  const imageSrc = `data:image/jpeg;base64,${imageBase64}`;
  const showNoMatchAlert = hasReceptor && !matchedCuenta && !cuentaId;
  const showMatchInfo = !!matchedCuenta && cuentaId === String(matchedCuenta.id);

  function handleCuentaChange(value: string) {
    setCuentaIdOverride(value);
  }

  async function handleCreateCuenta(data: Omit<CuentaReceptora, 'id' | 'creado_en'>) {
    const created = await createCuenta(data);
    await refresh();
    if (created.id) {
      setCuentaIdOverride(String(created.id));
    }
    setShowCreateCuenta(false);
  }

  const initialCuentaForCreate: CuentaReceptora = {
    nombre: '',
    banco: findClosestBanco(scanResult.banco_destino),
    telefono: scanResult.telefono_destino ?? '',
    cedula: scanResult.cedula_destino ?? '',
    activa: true,
  };

  useEffect(() => {
    const refTrim = referencia.trim();
    if (!refTrim) return;
    const montoNum = Number(monto);
    let cancelled = false;
    const handle = setTimeout(() => {
      checkDuplicatePago({
        referencia: refTrim,
        monto: !isNaN(montoNum) && montoNum > 0 ? montoNum : undefined,
        fecha: fecha || undefined,
        cedula: scanResult.cedula ?? undefined,
      })
        .then((res) => {
          if (!cancelled) setDupCheck(res);
        })
        .catch(() => {
          if (!cancelled) setDupCheck(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [referencia, monto, fecha, scanResult.cedula]);

  const hasDuplicate =
    referencia.trim().length > 0 && dupCheck?.duplicate === true && !!dupCheck.matches[0];

  function buildPagoData(): Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'> {
    return {
      monto: Number(monto),
      banco,
      cedula: `${tipoCedula}-${cedulaNum}`,
      telefono: scanResult.telefono ?? undefined,
      referencia,
      fecha,
      hora: hora || undefined,
      concepto: concepto || undefined,
      cuenta_receptora_id: cuentaId ? Number(cuentaId) : undefined,
      estado,
    };
  }

  async function runConfirm(data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm(data);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'No se pudo registrar el pago. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (submitting) return;
    const e: Record<string, string> = {};
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) e.monto = 'Monto inválido';
    if (!banco) e.banco = 'Selecciona un banco';
    if (!isValidCedula(`${tipoCedula}-${cedulaNum}`)) e.cedula = 'Cédula inválida';
    if (!referencia.trim()) e.referencia = 'Referencia requerida';
    if (!fecha) e.fecha = 'Fecha requerida';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const data = buildPagoData();
    if (hasDuplicate) {
      setPendingSubmit(data);
      setShowDupConfirm(true);
      return;
    }
    await runConfirm(data);
  }

  async function confirmDuplicateSubmit() {
    const data = pendingSubmit;
    setShowDupConfirm(false);
    setPendingSubmit(null);
    if (data) await runConfirm(data);
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.imageWrapper}
        onClick={() => setLightboxOpen(true)}
        aria-label="Ver comprobante"
      >
        <img src={imageSrc} alt="Comprobante escaneado" className={styles.image} />
        <span className={styles.zoomBadge}>
          <IconZoomIn size={16} stroke={2} />
          <span>Ver imagen</span>
        </span>
      </button>

      <ImageLightbox
        src={imageSrc}
        alt="Comprobante escaneado"
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {hasComision && (
        <div className={styles.comisionInfo}>
          <div className={styles.comisionRow}>
            <span>Monto total debitado</span>
            <span>{formatCurrencyBs(scanResult.montoTotal ?? 0)}</span>
          </div>
          <div className={styles.comisionRow}>
            <span>Comisión del banco</span>
            <span className={styles.comisionAmount}>
              - {formatCurrencyBs(scanResult.comision!)}
            </span>
          </div>
          <div className={`${styles.comisionRow} ${styles.comisionNet}`}>
            <span>Monto a registrar</span>
            <span>{formatCurrencyBs(scanResult.monto ?? 0)}</span>
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.title}>Verifica los datos</h3>
        <Input
          label="Monto (sin comisión)"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          error={errors.monto}
          prefix="Bs."
          inputMode="decimal"
          step="0.01"
        />
        <Select
          label="Banco origen"
          options={bancoOptions}
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          error={errors.banco}
          placeholder="Seleccionar banco"
        />
        <div className={styles.cedulaRow}>
          <Select
            label="Tipo"
            options={TIPOS_CEDULA.map((t) => ({ value: t, label: t }))}
            value={tipoCedula}
            onChange={(e) => setTipoCedula(e.target.value)}
          />
          <Input
            label="Cédula"
            value={cedulaNum}
            onChange={(e) => setCedulaNum(e.target.value.replace(/\D/g, ''))}
            error={errors.cedula}
            placeholder="12345678"
            inputMode="numeric"
          />
        </div>
        <Input
          label="Referencia"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
          error={errors.referencia}
          inputMode="numeric"
        />
        <div className={styles.dateRow}>
          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={errors.fecha}
          />
          <Input
            label="Hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>

        {showNoMatchAlert && (
          <div className={styles.cuentaAlert}>
            <IconAlertTriangle size={20} stroke={1.8} className={styles.cuentaAlertIcon} />
            <div className={styles.cuentaAlertBody}>
              <strong>No se encontró una cuenta receptora</strong>
              <span>
                Datos detectados:
                {scanResult.banco_destino ? ` ${scanResult.banco_destino}` : ''}
                {scanResult.telefono_destino ? ` · ${scanResult.telefono_destino}` : ''}
                {scanResult.cedula_destino ? ` · ${scanResult.cedula_destino}` : ''}
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateCuenta(true)}
              >
                Crear cuenta receptora
              </Button>
            </div>
          </div>
        )}

        {showMatchInfo && (
          <div className={styles.cuentaMatch}>
            <IconCircleCheck size={18} stroke={1.8} className={styles.cuentaMatchIcon} />
            <span>
              Vinculado automáticamente con <strong>{matchedCuenta!.nombre}</strong>
            </span>
          </div>
        )}

        {cuentas.length > 0 && (
          <Select
            label="Cuenta receptora"
            options={cuentas.map((c) => ({
              value: String(c.id),
              label: `${c.nombre} - ${c.banco}`,
            }))}
            value={cuentaId}
            onChange={(e) => handleCuentaChange(e.target.value)}
            placeholder="Sin cuenta asociada"
          />
        )}
        <Input
          label="Concepto (opcional)"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Descripción del pago"
        />
        <Select
          label="Estado"
          options={ESTADOS_SELECCIONABLES.map((e) => ({ value: e, label: ESTADO_LABELS[e] }))}
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoPago)}
        />

        {hasDuplicate && (
          <div className={styles.dupAlert}>
            <IconAlertTriangle size={20} stroke={1.8} className={styles.dupAlertIcon} />
            <div className={styles.dupAlertBody}>
              <strong>Posible pago duplicado</strong>
              <span>
                {dupCheck!.matches[0].match_type === 'referencia'
                  ? `Ya existe un pago con la misma referencia (${dupCheck!.matches[0].referencia})`
                  : 'Ya existe un pago con el mismo monto, fecha y cédula'}
                : {formatCurrencyBs(dupCheck!.matches[0].monto)} · {dupCheck!.matches[0].fecha}
                {dupCheck!.matches.length > 1 ? ` · +${dupCheck!.matches.length - 1} más` : ''}
              </span>
            </div>
          </div>
        )}

        {submitError && (
          <div className={styles.submitError} role="alert">
            <IconAlertTriangle size={20} stroke={1.8} className={styles.submitErrorIcon} />
            <div className={styles.submitErrorBody}>
              <strong>No se pudo registrar el pago</strong>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar pago'}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={showCreateCuenta}
        onClose={() => setShowCreateCuenta(false)}
        title="Crear cuenta receptora"
      >
        <CuentaForm
          initial={initialCuentaForCreate}
          onSubmit={handleCreateCuenta}
          onCancel={() => setShowCreateCuenta(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDupConfirm}
        onClose={() => {
          setShowDupConfirm(false);
          setPendingSubmit(null);
        }}
        onConfirm={confirmDuplicateSubmit}
        title="Posible duplicado"
        message={
          dupCheck?.matches[0]?.match_type === 'referencia'
            ? 'Ya existe un pago con esta referencia. ¿Registrar de todos modos?'
            : 'Ya existe un pago con el mismo monto, fecha y cédula. ¿Registrar de todos modos?'
        }
        confirmLabel="Registrar igual"
        confirmVariant="danger"
      />
    </div>
  );
}
