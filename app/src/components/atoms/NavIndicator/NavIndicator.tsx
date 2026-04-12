import styles from './NavIndicator.module.css';

interface NavIndicatorProps {
  index: number;
  total: number;
}

export default function NavIndicator({ index, total }: NavIndicatorProps) {
  return (
    <span
      className={styles.indicator}
      style={{
        width: `${100 / total}%`,
        transform: `translateX(${index * 100}%)`,
      }}
    />
  );
}
