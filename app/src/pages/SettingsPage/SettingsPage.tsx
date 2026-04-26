import { useState, useMemo } from 'react';
import {
  IconUser,
  IconBuilding,
  IconUsers,
  IconPalette,
  IconDownload,
} from '@tabler/icons-react';
import { usePermissions } from '@/hooks/usePermissions';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import SectionTabs from '@/components/atoms/SectionTabs/SectionTabs';
import SettingsPerfil from '@/components/organisms/SettingsPerfil/SettingsPerfil';
import SettingsEmpresa from '@/components/organisms/SettingsEmpresa/SettingsEmpresa';
import SettingsMiembros from '@/components/organisms/SettingsMiembros/SettingsMiembros';
import SettingsApariencia from '@/components/organisms/SettingsApariencia/SettingsApariencia';
import SettingsDatos from '@/components/organisms/SettingsDatos/SettingsDatos';

type SettingsSection = 'perfil' | 'empresa' | 'miembros' | 'datos' | 'apariencia';

export default function SettingsPage() {
  const perms = usePermissions();
  const [section, setSection] = useState<SettingsSection>('perfil');

  const tabs = useMemo(() => {
    const all: { key: SettingsSection; label: string; icon: React.ReactNode; visible: boolean }[] = [
      { key: 'perfil', label: 'Perfil', icon: <IconUser size={16} stroke={1.5} />, visible: true },
      { key: 'empresa', label: 'Empresa', icon: <IconBuilding size={16} stroke={1.5} />, visible: perms.canManageConfig },
      { key: 'miembros', label: 'Miembros', icon: <IconUsers size={16} stroke={1.5} />, visible: perms.canManageUsers },
      { key: 'datos', label: 'Datos', icon: <IconDownload size={16} stroke={1.5} />, visible: perms.canExport },
      { key: 'apariencia', label: 'Apariencia', icon: <IconPalette size={16} stroke={1.5} />, visible: true },
    ];
    return all.filter((t) => t.visible);
  }, [perms.canManageConfig, perms.canManageUsers, perms.canExport]);

  return (
    <div className="page">
      <AppHeader title="Ajustes" />

      <SectionTabs
        tabs={tabs}
        active={section}
        onChange={(k) => setSection(k as SettingsSection)}
      />

      {section === 'perfil' && <SettingsPerfil />}
      {section === 'empresa' && perms.canManageConfig && <SettingsEmpresa />}
      {section === 'miembros' && perms.canManageUsers && <SettingsMiembros />}
      {section === 'datos' && perms.canExport && <SettingsDatos />}
      {section === 'apariencia' && <SettingsApariencia />}
    </div>
  );
}
