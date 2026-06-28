import { useEffect } from 'react';
import type {
  AirtableRecord,
  AirtableListResponse,
  RestaurantFields,
  CategoryFields,
  ItemFields,
  ModifierFields,
  Restaurant,
  Category,
  Item,
  Modifier,
  ItemWithModifiers,
  CategoryWithItems,
  MenuPayload,
} from '../types/airtable';
import { useCartStore } from '../store/useCartStore';

// ─── Env config ───────────────────────────────────────────────────────────────

const BASE_ID = process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID ?? '';
const API_KEY = process.env.EXPO_PUBLIC_AIRTABLE_API_KEY ?? '';
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

// ─── Mappers: AirtableRecord<TFields> → domain model ─────────────────────────

function mapRestaurant(r: AirtableRecord<RestaurantFields>): Restaurant {
  return { _recordId: r.id, ...r.fields };
}

function mapCategory(r: AirtableRecord<CategoryFields>): Category {
  return { _recordId: r.id, ...r.fields };
}

function mapItem(r: AirtableRecord<ItemFields>): Item {
  return { _recordId: r.id, ...r.fields };
}

function mapModifier(r: AirtableRecord<ModifierFields>): Modifier {
  return { _recordId: r.id, ...r.fields };
}

// ─── Airtable fetch helper ────────────────────────────────────────────────────

async function airtableFetch<TFields>(
  tableName: string,
  formula: string,
  signal: AbortSignal
): Promise<AirtableRecord<TFields>[]> {
  const url =
    `${AIRTABLE_BASE_URL}/${encodeURIComponent(tableName)}` +
    `?filterByFormula=${encodeURIComponent(formula)}`;

  const res = await fetch(url, {
    signal,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable [${tableName}] ${res.status}: ${body}`);
  }

  const data: AirtableListResponse<TFields> = await res.json();
  return data.records;
}

// ─── Airtable formula helpers ─────────────────────────────────────────────────

/**
 * Builds an equality filter for a single field value.
 *   singleEqual('slug', 'tacos-al-amin')
 *   → '{slug}="tacos-al-amin"'
 */
function singleEqual(field: string, value: string): string {
  return `{${field}}="${value}"`;
}

/**
 * Builds an OR filter across multiple values for the same field.
 * Falls back to a plain equality expression when only one value is given,
 * since Airtable accepts single-argument OR() but the plain form is cleaner.
 *
 *   orEqual('category_id', ['cat_1', 'cat_2'])
 *   → 'OR({category_id}="cat_1",{category_id}="cat_2")'
 */
function orEqual(field: string, values: string[]): string {
  const conditions = values.map((v) => `{${field}}="${v}"`).join(',');
  return values.length === 1 ? conditions : `OR(${conditions})`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the full menu for a given restaurant slug from Airtable and
 * hydrates the Zustand store. Components read `menuPayload`, `isMenuLoading`,
 * and `menuError` directly from the store; this hook returns nothing.
 *
 * Fetch sequence:
 *   Round 1 (parallel): Restaurants + Categories   — both filter by slug
 *   Round 2 (serial):   Items                      — filters by category_id list
 *   Round 3 (serial):   Modifiers                  — filters by item_id list
 *
 * Rounds 2 and 3 are skipped entirely (no network call) when the upstream
 * list is empty, so an empty category or item set doesn't waste requests.
 */
export function useFetchMenu(restaurantSlug: string): void {
  const setMenuPayload = useCartStore((s) => s.setMenuPayload);
  const setMenuLoading = useCartStore((s) => s.setMenuLoading);
  const setMenuError = useCartStore((s) => s.setMenuError);

  useEffect(() => {
    if (!restaurantSlug) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchMenu(): Promise<void> {
      setMenuLoading(true);
      setMenuError(null);

      try {
        // ── Round 1: restaurant + categories (parallel, both keyed by slug) ──
        const [restaurantRecords, categoryRecords] = await Promise.all([
          airtableFetch<RestaurantFields>(
            'Restaurants',
            singleEqual('slug', restaurantSlug),
            signal
          ),
          airtableFetch<CategoryFields>(
            'Categories',
            singleEqual('restaurant_slug', restaurantSlug),
            signal
          ),
        ]);

        if (restaurantRecords.length === 0) {
          throw new Error(`Restaurant "${restaurantSlug}" not found.`);
        }

        const restaurant = mapRestaurant(restaurantRecords[0]);

        const categories: Category[] = categoryRecords
          .map(mapCategory)
          .sort((a, b) => a.sort_order - b.sort_order);

        // ── Round 2: items (skip if no categories) ────────────────────────────
        const categoryIds = categories.map((c) => c.category_id);

        const items: Item[] =
          categoryIds.length === 0
            ? []
            : (
                await airtableFetch<ItemFields>(
                  'Items',
                  orEqual('category_id', categoryIds),
                  signal
                )
              ).map(mapItem);

        // ── Round 3: modifiers (skip if no items) ─────────────────────────────
        const itemIds = items.map((i) => i.item_id);

        const modifiers: Modifier[] =
          itemIds.length === 0
            ? []
            : (
                await airtableFetch<ModifierFields>(
                  'Modifiers',
                  orEqual('item_id', itemIds),
                  signal
                )
              ).map(mapModifier);

        // ── Compose: modifiers → items → categories ───────────────────────────

        const modsByItemId = new Map<string, Modifier[]>();
        for (const mod of modifiers) {
          const bucket = modsByItemId.get(mod.item_id) ?? [];
          bucket.push(mod);
          modsByItemId.set(mod.item_id, bucket);
        }

        const itemsByCategoryId = new Map<string, ItemWithModifiers[]>();
        for (const item of items) {
          const itemWithMods: ItemWithModifiers = {
            ...item,
            modifiers: modsByItemId.get(item.item_id) ?? [],
          };
          const bucket = itemsByCategoryId.get(item.category_id) ?? [];
          bucket.push(itemWithMods);
          itemsByCategoryId.set(item.category_id, bucket);
        }

        const categoriesWithItems: CategoryWithItems[] = categories.map((cat) => ({
          ...cat,
          items: itemsByCategoryId.get(cat.category_id) ?? [],
        }));

        const payload: MenuPayload = { restaurant, categories: categoriesWithItems };
        setMenuPayload(payload);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setMenuError(err instanceof Error ? err.message : 'Failed to load menu.');
      } finally {
        setMenuLoading(false);
      }
    }

    fetchMenu();

    return () => controller.abort();
  }, [restaurantSlug, setMenuPayload, setMenuLoading, setMenuError]);
}
