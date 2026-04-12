import Card from '@/components/atoms/Card/Card';
import Badge from '@/components/atoms/Badge/Badge';
import type { StatsBreakdown } from '@/types/common';
import styles from './BankRanking.module.css';

interface BankRankingProps {
  data: StatsBreakdown[];
  formatter: (n: number) => string;
}

export default function BankRanking({ data, formatter }: BankRankingProps) {
  if (data.length === 0) return null;

  const maxTotal = data[0]?.total ?? 1;

  return (
    <Card className={styles.card}>
      <h3 className={styles.title}>Ranking de bancos</h3>
      <div className={styles.list}>
        {data.map((item, i) => (
          <div key={item.grupo} className={styles.row}>
            <div className={styles.info}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.name}>{item.grupo}</span>
              {i === 0 && <Badge variant="success">Top</Badge>}
            </div>
            <div className={styles.stats}>
              <span className={styles.amount}>{formatter(item.total)}</span>
              <span className={styles.count}>{item.cantidad} pagos</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(item.total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
