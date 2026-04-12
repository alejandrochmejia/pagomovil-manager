import { useState, type FormEvent } from 'react';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import { BANCOS, TIPOS_CEDULA } from '@/utils/constants';
import { isValidCedula, isValidPhone } from '@/utils/validators';
import type { CuentaReceptora } from '@/types/pago';
import styles from './CuentaForm.module.css';

const bancoOptions = BANCOS.map((b) => ({ value: b.nombre, label: b.nombre }));

interface CuentaFormProps {
  initial?: CuentaReceptora;
  onSubmit: (data: Omit<CuentaReceptora, 'id' | 'creado_en'>) => void;
  onCancel: () => void;
}

export default function CuentaForm({ initial, onSubmit, onCancel }: CuentaFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [banco, setBanco] = useState(initial?.banco ?? '');
  const [tipoCedula, setTipoCedula] = useState(
    initial?.cedula?.charAt(0) ?? 'V',
  );
  const [cedula, setCedula] = useState(
    initial?.cedula?.replace(/^[VJEG]-/, '') ?? '',
  );
  const [telefono, setTelefono] = useState(initial?.telefono ?? '');
  const [activa, setActiva] = useState(initial?.activa ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Requerido';
    if (!banco) e.banco = 'Selecciona un banco';
    const fullCedula = `${tipoCedula}-${cedula}`;
    if (!isValidCedula(fullCedula)) e.cedula = 'Cédula inválida (ej: V-12345678)';
    if (!isValidPhone(telefono)) e.telefono = 'Teléfono inválido (ej: 0412-1234567)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      nombre: nombre.trim(),
      banco,
      cedula: `${tipoCedula}-${cedula}`,
      telefono,
      activa,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        error={errors.nombre}
        placeholder="Nombre del titular"
      />
      <Select
        label="Banco"
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
        label="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        error={errors.telefono}
        placeholder="0412-1234567"
        inputMode="tel"
      />
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
        />
        <span>Cuenta activa</span>
      </label>
      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initial ? 'Guardar' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  );
}
