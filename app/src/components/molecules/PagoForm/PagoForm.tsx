import { useState, type FormEvent } from 'react';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import { BANCOS, TIPOS_CEDULA } from '@/utils/constants';
import { isValidCedula, isValidMonto, isValidReferencia } from '@/utils/validators';
import { toISODate } from '@/utils/format';
import type { Pago } from '@/types/pago';
import styles from './PagoForm.module.css';

const bancoOptions = BANCOS.map((b) => ({ value: b.nombre, label: b.nombre }));

interface PagoFormProps {
  initial?: Partial<Pago>;
  onSubmit: (data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) => void;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      monto: Number(monto),
      banco,
      cedula: `${tipoCedula}-${cedula}`,
      telefono: telefono || undefined,
      referencia,
      fecha,
      hora: hora || undefined,
      concepto: concepto || undefined,
    });
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
      <Input
        label="Concepto (opcional)"
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        placeholder="Descripción del pago"
      />
      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel ?? (initial?.id ? 'Guardar' : 'Registrar')}</Button>
      </div>
    </form>
  );
}
