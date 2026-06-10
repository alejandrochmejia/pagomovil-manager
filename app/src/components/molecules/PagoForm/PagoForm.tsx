import { useState, type FormEvent } from 'react';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import { IconAlertTriangle } from '@tabler/icons-react';
import {
  BANCOS,
  TIPOS_CEDULA,
  ESTADO_LABELS,
  ESTADOS_SELECCIONABLES,
  type EstadoPago,
} from '@/utils/constants';
import { isValidCedula, isValidMonto, isValidReferencia } from '@/utils/validators';
import { toISODate } from '@/utils/format';
import { useCuentas } from '@/hooks/useCuentas';
import type { Pago } from '@/types/pago';
import styles from './PagoForm.module.css';

const bancoOptions = BANCOS.map((b) => ({ value: b.nombre, label: b.nombre }));
const estadoOptions = ESTADOS_SELECCIONABLES.map((e) => ({ value: e, label: ESTADO_LABELS[e] }));

interface PagoFormProps {
  initial?: Partial<Pago>;
  onSubmit: (data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function PagoForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: PagoFormProps) {
  const [monto, setMonto] = useState(initial?.monto?.toString() ?? '');
  const [banco, setBanco] = useState(initial?.banco ?? '');
  const [tipoCedula, setTipoCedula] = useState(
    initial?.cedula?.charAt(0) ?? 'V',
  );
  const [cedula, setCedula] = useState(
    initial?.cedula?.replace(/^[VJEG]-/, '') ?? '',
  );
  const [telefono, setTelefono] = useState(initial?.telefono ?? '');
  const [referencia, setReferencia] = useState(initial?.referencia ?? '');
  const [fecha, setFecha] = useState(initial?.fecha ?? toISODate(new Date()));
  const [hora, setHora] = useState(initial?.hora ?? '');
  const [concepto, setConcepto] = useState(initial?.concepto ?? '');
  const [cuentaId, setCuentaId] = useState(initial?.cuenta_receptora_id?.toString() ?? '');
  const [estado, setEstado] = useState<EstadoPago>(
    (initial?.estado as EstadoPago | undefined) ?? 'confirmado',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { cuentas } = useCuentas();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!isValidMonto(Number(monto))) e.monto = 'Monto inválido';
    if (!banco) e.banco = 'Selecciona un banco';
    const fullCedula = `${tipoCedula}-${cedula}`;
    if (!isValidCedula(fullCedula)) e.cedula = 'Cédula inválida';
    if (!isValidReferencia(referencia)) e.referencia = 'Referencia inválida (solo números)';
    if (!fecha) e.fecha = 'Fecha requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({
        monto: Number(monto),
        banco,
        cedula: `${tipoCedula}-${cedula}`,
        telefono: telefono || undefined,
        referencia,
        fecha,
        hora: hora || undefined,
        concepto: concepto || undefined,
        cuenta_receptora_id: cuentaId ? Number(cuentaId) : undefined,
        estado,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'No se pudo guardar el pago. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Monto"
        type="number"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        error={errors.monto}
        placeholder="0.00"
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
          value={cedula}
          onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
          error={errors.cedula}
          placeholder="12345678"
          inputMode="numeric"
        />
      </div>
      <Input
        label="Teléfono (opcional)"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="0412-1234567"
        inputMode="tel"
      />
      <Input
        label="Referencia"
        value={referencia}
        onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
        error={errors.referencia}
        placeholder="Número de referencia"
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
          label="Hora (opcional)"
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
        />
      </div>
      {cuentas.length > 0 && (
        <Select
          label="Cuenta receptora (opcional)"
          options={cuentas.map((c) => ({
            value: String(c.id),
            label: `${c.nombre} - ${c.banco}`,
          }))}
          value={cuentaId}
          onChange={(e) => setCuentaId(e.target.value)}
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
        options={estadoOptions}
        value={estado}
        onChange={(e) => setEstado(e.target.value as EstadoPago)}
      />
      {submitError && (
        <div className={styles.submitError} role="alert">
          <IconAlertTriangle size={20} stroke={1.8} className={styles.submitErrorIcon} />
          <div className={styles.submitErrorBody}>
            <strong>No se pudo guardar el pago</strong>
            <span>{submitError}</span>
          </div>
        </div>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : (submitLabel ?? (initial?.id ? 'Guardar' : 'Registrar'))}
        </Button>
      </div>
    </form>
  );
}
