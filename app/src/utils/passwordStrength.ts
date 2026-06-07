export type PasswordLevel = 'debil' | 'regular' | 'buena' | 'excelente';

export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
}

export interface PasswordEvaluation {
  score: number;
  level: PasswordLevel;
  label: string;
  meetsRequirements: boolean;
  checks: PasswordChecks;
}

const MIN_LENGTH = 8;
const MIN_CATEGORIES = 3;

export function evaluatePassword(password: string): PasswordEvaluation {
  const len = password.length;
  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const number = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);

  const categoriesMet = [lower, upper, number, symbol].filter(Boolean).length;

  let score = 0;
  if (len >= 6) score += 20;
  if (len >= 10) score += 15;
  if (len >= 14) score += 10;
  score += categoriesMet * 10;
  if (categoriesMet >= 3) score += 15;
  score = Math.min(score, 100);

  const meetsRequirements = len >= MIN_LENGTH && categoriesMet >= MIN_CATEGORIES;

  let level: PasswordLevel;
  let label: string;
  if (score < 40) {
    level = 'debil';
    label = 'Débil';
  } else if (score < 60) {
    level = 'regular';
    label = 'Regular';
  } else if (score < 80) {
    level = 'buena';
    label = 'Buena';
  } else {
    level = 'excelente';
    label = 'Excelente';
  }

  return {
    score,
    level,
    label,
    meetsRequirements,
    checks: {
      length: len >= MIN_LENGTH,
      lower,
      upper,
      number,
      symbol,
    },
  };
}
