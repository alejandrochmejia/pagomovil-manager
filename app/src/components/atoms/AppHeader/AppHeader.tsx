import type { ReactNode } from 'react';
import { IconBuilding } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { ROL_LABELS } from '@/types/roles';
import Badge from '@/components/atoms/Badge/Badge';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  title: string;
  actions?: ReactNode;
}

export default function AppHeader({ title, actions }: AppHeaderProps) {
  const { empresas, empresaId } = useAuth();
  const { rol } = usePermissions();
  const empresa = empresas.find((e) => e.id === empresaId);

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
        {empresa && (
          <div className={styles.empresa}>
            <IconBuilding size={12} stroke={1.5} />
            <span className={styles.name}>{empresa.nombre}</span>
          </div>
        )}
      </div>
      <div className={styles.right}>
        <Badge variant="info">{ROL_LABELS[rol]}</Badge>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
