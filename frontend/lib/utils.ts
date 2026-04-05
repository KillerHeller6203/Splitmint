import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function computeSettlements(balances: { user_name: string; owes_to_name: string; amount: number }[]) {
  const net: Record<string, number> = {}
  for (const b of balances) {
    net[b.user_name] = (net[b.user_name] ?? 0) - b.amount
    net[b.owes_to_name] = (net[b.owes_to_name] ?? 0) + b.amount
  }
  const debtors: { name: string; amount: number }[] = []
  const creditors: { name: string; amount: number }[] = []
  for (const [name, amount] of Object.entries(net)) {
    if (amount < -0.001) debtors.push({ name, amount: -amount })
    else if (amount > 0.001) creditors.push({ name, amount })
  }
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)
  const settlements: { from: string; to: string; amount: number }[] = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount)
    if (payment > 0.001) {
      settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(payment * 100) / 100 })
    }
    debtors[i].amount -= payment
    creditors[j].amount -= payment
    if (debtors[i].amount < 0.001) i++
    if (creditors[j].amount < 0.001) j++
  }
  return settlements
}

// Avatar colour palette from name
const PALETTE = [
  '#0d9488','#0284c7','#7c3aed','#db2777','#ea580c','#65a30d','#0891b2','#9333ea'
]
export function avatarColor(name?: string) {
  const safeName = name?.trim() || ''
  let h = 0
  for (let i = 0; i < safeName.length; i++) h = (h * 31 + safeName.charCodeAt(i)) % PALETTE.length
  return PALETTE[h]
}
