import { useState } from 'react';
import {
  IconUser,
  IconBuilding,
  IconUsers,
  IconPalette,
} from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import SectionTabs from '@/components/atoms/SectionTabs/SectionTabs';
import SettingsPerfil from '@/components/organisms/SettingsPerfil/SettingsPerfil';
import SettingsEmpresa from '@/components/organisms/SettingsEmpresa/SettingsEmpresa';
import SettingsMiembros from '@/components/organisms/SettingsMiembros/SettingsMiembros';
import SettingsApariencia from '@/components/organisms/SettingsApariencia/SettingsApariencia';

type SettingsSection = 'perfil' | 'empresa' | 'miembros' | 'apariencia';

const TABS: { key: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { key: 'perfil', label: 'Perfil', icon: <IconUser size={16} stroke={1.5} /> },
  { key: 'empresa', label: 'Empresa', icon: <IconBuilding size={16} stroke={1.5} /> },
  { key: 'miembros', label: 'Miembros', icon: <IconUsers size={16} stroke={1.5} /> },
  { key: 'apariencia', label: 'Apariencia', icon: <IconPalette size={16} stroke={1.5} /> },
];

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('perfil');

  return (
    <div className="page">
      <AppHeader title="Ajustes" />

      <SectionTabs
        tabs={TABS}
        active={section}
        onChange={(k) => setSection(k as SettingsSection)}
      />

      {section === 'perfil' && <SettingsPerfil />}
      {section === 'empresa' && <SettingsEmpresa />}
      {section === 'miembros' && <SettingsMiembros />}
      {section === 'apariencia' && <SettingsApariencia />}
    </div>
  );
}
