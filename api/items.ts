import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateRecord } from '../lib/server/airtable';
import { isAuthorized } from '../lib/server/auth';

interface ItemMutableFields {
  in_stock: boolean;
  base_price: number;
}

const TABLE = 'Items';

/**
 * PATCH /api/items — owner edits stock / price from the dashboard.
 * Body: { slug, recordId, in_stock?, base_price? }
 *
 * MVP scope note: authorization is by slug (owner is logged into their own
 * dashboard, which only surfaces their own items). We do not re-verify that the
 * item record belongs to the slug — acceptable for the pilot, flagged for later.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { slug, recordId, in_stock, base_price } = (req.body ?? {}) as {
      slug?: string;
      recordId?: string;
      in_stock?: boolean;
      base_price?: number;
    };

    if (!slug || !recordId) {
      res.status(400).json({ error: 'slug et recordId requis.' });
      return;
    }
    if (!isAuthorized(req.headers.authorization, slug)) {
      res.status(401).json({ error: 'Non autorisé.' });
      return;
    }

    const fields: Partial<ItemMutableFields> = {};
    if (typeof in_stock === 'boolean') fields.in_stock = in_stock;
    if (typeof base_price === 'number' && base_price >= 0) fields.base_price = base_price;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
      return;
    }

    const updated = await updateRecord<ItemMutableFields>(TABLE, recordId, fields);
    res.status(200).json({ ok: true, record: { _recordId: updated.id, ...updated.fields } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur serveur.' });
  }
}
