import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listRecords, escapeFormulaValue } from '../lib/server/airtable';
import { issueToken } from '../lib/server/auth';

interface RestaurantAuthFields {
  slug: string;
  restaurant_name: string;
  dashboard_password?: string;
}

/**
 * POST /api/auth
 * Body: { slug, password }
 * → { token, slug, restaurant_name } on success, 401 otherwise.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { slug, password } = (req.body ?? {}) as { slug?: string; password?: string };
    if (!slug || !password) {
      res.status(400).json({ error: 'slug et mot de passe requis.' });
      return;
    }

    const rows = await listRecords<RestaurantAuthFields>('Restaurants', {
      filterByFormula: `{slug}="${escapeFormulaValue(slug)}"`,
    });
    const restaurant = rows[0];

    if (
      !restaurant ||
      !restaurant.fields.dashboard_password ||
      restaurant.fields.dashboard_password !== password
    ) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    res.status(200).json({
      token: issueToken(slug),
      slug,
      restaurant_name: restaurant.fields.restaurant_name,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur serveur.' });
  }
}
