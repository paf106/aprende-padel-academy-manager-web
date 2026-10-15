export type PaymentBalance = {
  paidCents: number
  balanceCents: number
  status: 'pending' | 'partial' | 'paid'
}

export function paymentBalance(dueCents: number, transactions: readonly number[]): PaymentBalance {
  if (
    !Number.isSafeInteger(dueCents) ||
    dueCents < 0 ||
    transactions.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    throw new Error('Los importes deben ser números enteros no negativos de céntimos')
  }
  const paidCents = transactions.reduce((total, amount) => total + amount, 0)
  return {
    paidCents,
    balanceCents: Math.max(0, dueCents - paidCents),
    status: paidCents >= dueCents ? 'paid' : paidCents > 0 ? 'partial' : 'pending',
  }
}
