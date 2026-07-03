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
  RESERVATION_STATUSES,
  type CreateReservationInput,
  type ReservationRecord,
  type ReservationStatus,
} from '../types/orders';

interface ReservationFields {
  reservation_id: string;
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  date: string;
  time: string;
  status: ReservationStatus;
  notes?: string;
}

const TABLE = 'Reservations';

function toRecord(row: AirtableRow<ReservationFields>): ReservationRecord {
  const f = row.fields;
  return {
    _recordId: row.id,
    reservation_id: f.reservation_id,
    restaurant_slug: f.restaurant_slug,
    customer_name: f.customer_name,
    customer_phone: f.customer_phone,
    party_size: f.party_size,
    date: f.date,
    time: f.time,
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

// ── POST (public): create a reservation ──────────────────────────────────────
async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as Partial<CreateReservationInput>;

  if (
    !body.restaurant_slug ||
    !body.customer_name ||
    !body.customer_phone ||
    !body.party_size ||
    !body.date ||
    !body.time
  ) {
    res.status(400).json({ error: 'Champs de réservation manquants.' });
    return;
  }

  const reservation_id = `RES-${Date.now()}`;
  const created = await createRecord<ReservationFields>(TABLE, {
    reservation_id,
    restaurant_slug: body.restaurant_slug,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    party_size: Number(body.party_size),
    date: body.date,
    time: body.time,
    status: 'nouveau',
    notes: body.notes ?? '',
  });

  res.status(201).json({ ok: true, reservation_id, record: toRecord(created) });
}

// ── GET (auth): list reservations for a slug ─────────────────────────────────
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

  const rows = await listRecords<ReservationFields>(TABLE, {
    filterByFormula: `{restaurant_slug}="${escapeFormulaValue(slug)}"`,
  });
  const reservations = rows
    .map(toRecord)
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime));

  res.status(200).json({ reservations });
}

// ── PATCH (auth): update reservation status ──────────────────────────────────
async function handlePatch(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { slug, recordId, status } = (req.body ?? {}) as {
    slug?: string;
    recordId?: string;
    status?: ReservationStatus;
  };

  if (!slug || !recordId || !status) {
    res.status(400).json({ error: 'slug, recordId et status requis.' });
    return;
  }
  if (!isAuthorized(req.headers.authorization, slug)) {
    res.status(401).json({ error: 'Non autorisé.' });
    return;
  }
  if (!RESERVATION_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }

  const updated = await updateRecord<ReservationFields>(TABLE, recordId, { status });
  res.status(200).json({ ok: true, record: toRecord(updated) });
}
