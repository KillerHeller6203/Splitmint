const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    const err = await res.json().catch(() => ({ detail: 'Unauthorized' }))
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new ApiError(err.detail || err.error || 'Not authenticated', 401)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new ApiError(err.detail || err.error || 'Request failed', res.status)
  }

  if (res.status === 204) return null as T
  return res.json()
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => request<User>('/auth/me'),
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export const groups = {
  list: () => request<Group[]>('/groups'),

  create: (name: string, member_email?: string) =>
    request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, member_email }),
    }),

  update: (id: number, name: string) =>
    request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: number) =>
    request<null>(`/groups/${id}`, { method: 'DELETE' }),

  addMember: (id: number, email: string) =>
    request<Group>(`/groups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeMember: (id: number, memberId: number) =>
    request<null>(`/groups/${id}/members/${memberId}`, { method: 'DELETE' }),
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export const expenses = {
  list: () => request<Expense[]>('/expenses'),

  create: (data: CreateExpensePayload) =>
    request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateExpensePayload>) =>
    request<Expense>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<null>(`/expenses/${id}`, { method: 'DELETE' }),
}

// ─── Balances ────────────────────────────────────────────────────────────────

export const balances = {
  list: () => request<Balance[]>('/balances'),
  summary: () => request<BalanceSummary>('/balances/summary'),
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
}

export interface Member {
  id: number
  name: string
  email: string
  color?: string
}

export interface Group {
  id: number
  name: string
  members: Member[]
  created_at: string
}

export interface ExpenseSplit {
  id: number
  expense_id: number
  user_id: number
  amount: number
  percentage?: number
}

export interface Expense {
  id: number
  group_id: number
  group_name: string
  description: string
  amount: string
  paid_by_name: string
  split_type: 'equal' | 'percentage' | 'custom'
  created_at: string
  date?: string
  splits?: ExpenseSplit[]
}

export interface CreateExpensePayload {
  group_id: number
  description: string
  amount: number
  split_type: 'equal' | 'percentage' | 'custom'
  date?: string
  splits?: { user_id: number; amount: number; percentage?: number }[]
}

export interface Balance {
  user_id: number
  user_name: string
  owes_to: number
  owes_to_name: string
  amount: number
}

export interface BalanceSummary {
  total_owed: number
  total_owing: number
  net_balance: number
}
