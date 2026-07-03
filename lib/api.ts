// ─── Client API helper ────────────────────────────────────────────────────────
// Thin fetch wrapper the Expo (web) app uses to talk to our serverless /api.
// Never touches Airtable directly — the write token lives only on the server.
//
// Base URL: same-origin in production ('' → '/api/...'). For local `vercel dev`
// or a split host, set EXPO_PUBLIC_API_BASE_URL.

import type {
  AuthResponse,
  CreateOrderInput,
  CreateReservationInput,
  OrderRecord,
  OrderStatus,
  ReservationRecord,
  ReservationStatus,
} from '../types/orders';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}/api/${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  }
  return data as T;
}

// ── Public (customer) ────────────────────────────────────────────────────────

export function submitOrder(
  input: CreateOrderInput
): Promise<{ ok: true; order_id: string; record: OrderRecord }> {
  return request('orders', { method: 'POST', body: input });
}

export function submitReservation(
  input: CreateReservationInput
): Promise<{ ok: true; reservation_id: string; record: ReservationRecord }> {
  return request('reservations', { method: 'POST', body: input });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function login(slug: string, password: string): Promise<AuthResponse> {
  return request('auth', { method: 'POST', body: { slug, password } });
}

// ── Dashboard (authed) ───────────────────────────────────────────────────────

export function fetchOrders(slug: string, token: string): Promise<{ orders: OrderRecord[] }> {
  return request(`orders?slug=${encodeURIComponent(slug)}`, { token });
}

export function patchOrder(
  slug: string,
  recordId: string,
  status: OrderStatus,
  token: string
): Promise<{ ok: true; record: OrderRecord }> {
  return request('orders', { method: 'PATCH', body: { slug, recordId, status }, token });
}

export function fetchReservations(
  slug: string,
  token: string
): Promise<{ reservations: ReservationRecord[] }> {
  return request(`reservations?slug=${encodeURIComponent(slug)}`, { token });
}

export function patchReservation(
  slug: string,
  recordId: string,
  status: ReservationStatus,
  token: string
): Promise<{ ok: true; record: ReservationRecord }> {
  return request('reservations', { method: 'PATCH', body: { slug, recordId, status }, token });
}

export function patchItem(
  slug: string,
  recordId: string,
  changes: { in_stock?: boolean; base_price?: number },
  token: string
): Promise<{ ok: true }> {
  return request('items', { method: 'PATCH', body: { slug, recordId, ...changes }, token });
}
