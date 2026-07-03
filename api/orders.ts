import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  listRecords,
  createRecord,
  updateRecord,
  escapeFormulaValue,
  type AirtableRow,
} from '../lib/server/airtable';
import { isAuthorized } from '../lib/server/auth';
import {
  ORDER_STATUSES,
  type CreateOrderInput,
  type OrderLineInput,
  type OrderRecord,
  type OrderStatus,
} from '../types/orders';

interface OrderFields {
  order_id: string;
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items_summary: string;
  items_json: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  notes?: string;
}

const TABLE = 'Orders';

function buildSummary(lines: OrderLineInput[]): string {
  return lines
    .map((l) => {
      const base = `${l.quantity}x ${l.name_fr} — ${(l.unit_price * l.quantity).toFixed(2)} DH`;
      const mods = l.modifiers.map((m) => `   › ${m}`).join('\n');
      return mods ? `${base}\n${mods}` : base;
    })
    .join('\n');
}

function toRecord(row: AirtableRow<OrderFields>): OrderRecord {
  const f = row.fields;
  return {
    _recordId: row.id,
    order_id: f.order_id,
    restaurant_slug: f.restaurant_slug,
    customer_name: f.customer_name,
    customer_phone: f.customer_phone,
    delivery_address: f.delivery_address,
    items_summary: f.items_summary,
    items_json: f.items_json,
    subtotal: f.subtotal,
    delivery_fee: f.delivery_fee,
    total: f.total,
    payment_method: f.payment_method,
    status: f.status,
    notes: f.notes,
    createdTime: row.createdTime,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    switch (req.method) {
      case 'POST':
        return await handleCreate(req, res);
      case 'GET':
        return await handleList(req, res);
      case 'PATCH':
        return await handlePatch(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur serveur.' });
  }
}

// ── POST (public): create a COD order ────────────────────────────────────────
async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as Partial<CreateOrderInput>;

  if (
    !body.restaurant_slug ||
    !body.customer_name ||
    !body.customer_phone ||
    !body.delivery_address ||
    !Array.isArray(body.lines) ||
    body.lines.length === 0
  ) {
    res.status(400).json({ error: 'Champs de commande manquants.' });
    return;
  }

  const order_id = `ORD-${Date.now()}`;
  const created = await createRecord<OrderFields>(TABLE, {
    order_id,
    restaurant_slug: body.restaurant_slug,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    delivery_address: body.delivery_address,
    items_summary: buildSummary(body.lines),
    items_json: JSON.stringify(body.lines),
    subtotal: Number(body.subtotal ?? 0),
    delivery_fee: Number(body.delivery_fee ?? 0),
    total: Number(body.total ?? 0),
    payment_method: 'COD',
    status: 'nouveau',
    notes: body.notes ?? '',
  });

  res.status(201).json({ ok: true, order_id, record: toRecord(created) });
}

// ── GET (auth): list orders for a slug ───────────────────────────────────────
async function handleList(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = String(req.query.slug ?? '');
  if (!slug) {
    res.status(400).json({ error: 'slug requis.' });
    return;
  }
  if (!isAuthorized(req.headers.authorization, slug)) {
    res.status(401).json({ error: 'Non autorisé.' });
    return;
  }

  const rows = await listRecords<OrderFields>(TABLE, {
    filterByFormula: `{restaurant_slug}="${escapeFormulaValue(slug)}"`,
  });
  const orders = rows
    .map(toRecord)
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime));

  res.status(200).json({ orders });
}

// ── PATCH (auth): update order status ────────────────────────────────────────
async function handlePatch(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { slug, recordId, status } = (req.body ?? {}) as {
    slug?: string;
    recordId?: string;
    status?: OrderStatus;
  };

  if (!slug || !recordId || !status) {
    res.status(400).json({ error: 'slug, recordId et status requis.' });
    return;
  }
  if (!isAuthorized(req.headers.authorization, slug)) {
    res.status(401).json({ error: 'Non autorisé.' });
    return;
  }
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }

  const updated = await updateRecord<OrderFields>(TABLE, recordId, { status });
  res.status(200).json({ ok: true, record: toRecord(updated) });
}
