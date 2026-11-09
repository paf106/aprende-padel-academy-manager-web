export function formatMoney(amountCents: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amountCents / 100)
}
