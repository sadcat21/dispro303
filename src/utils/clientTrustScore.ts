export interface ClientTrustScoreInput {
  totalDebt: number;
  paidAmount: number;
  noCollectionVisits: number;
  paymentVisitNumber: number;
}

export interface ClientTrustScoreResult {
  score: number;
  paymentRate: number;
  visitPenalty: number;
  bonus: number;
  labelAr: string;
  labelFr: string;
  tone: 'good' | 'medium' | 'weak';
}

export interface TrustHistoryDebtLike {
  id: string;
  customer_id?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
}

export interface TrustHistoryCollectionLike {
  debt_id?: string | null;
  amount?: number | null;
  created_at?: string | null;
}

export function computeClientTrustScore(input: ClientTrustScoreInput): ClientTrustScoreResult {
  const totalDebt = Math.max(0, Number(input.totalDebt || 0));
  const paidAmount = Math.max(0, Number(input.paidAmount || 0));
  const noCollectionVisits = Math.max(0, Number(input.noCollectionVisits || 0));
  const paymentVisitNumber = Math.max(0, Number(input.paymentVisitNumber || 0));

  const paymentRate = totalDebt > 0 ? (paidAmount / totalDebt) * 100 : 0;
  const visitPenalty = noCollectionVisits * 5;
  const bonus = paymentVisitNumber === 1 ? 5 : paymentVisitNumber === 2 ? 2 : 0;
  const rawScore = paymentRate + bonus - visitPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (score > 80) {
    return {
      score,
      paymentRate,
      visitPenalty,
      bonus,
      labelAr: 'عميل موثوق',
      labelFr: 'Client fiable',
      tone: 'good',
    };
  }

  if (score >= 50) {
    return {
      score,
      paymentRate,
      visitPenalty,
      bonus,
      labelAr: 'عميل متوسط',
      labelFr: 'Client moyen',
      tone: 'medium',
    };
  }

  return {
    score,
    paymentRate,
    visitPenalty,
    bonus,
    labelAr: 'عميل ضعيف',
    labelFr: 'Client faible',
    tone: 'weak',
  };
}

export function computeClientTrustScoreFromHistory(
  debts: TrustHistoryDebtLike[],
  collections: TrustHistoryCollectionLike[],
): ClientTrustScoreResult {
  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.total_amount || 0), 0);
  const paidAmount = debts.reduce((sum, debt) => sum + Number(debt.paid_amount || 0), 0);

  const chronological = [...collections]
    .filter((item) => item.created_at)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  const noCollectionVisits = chronological.filter((item) => Number(item.amount || 0) <= 0).length;
  const firstPositiveIndex = chronological.findIndex((item) => Number(item.amount || 0) > 0);
  const paymentVisitNumber =
    firstPositiveIndex >= 0
      ? chronological.slice(0, firstPositiveIndex + 1).filter((item) => Number(item.amount || 0) <= 0).length + 1
      : 3;

  return computeClientTrustScore({
    totalDebt,
    paidAmount,
    noCollectionVisits,
    paymentVisitNumber,
  });
}
