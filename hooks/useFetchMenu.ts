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

// ─── Linked-record helper ─────────────────────────────────────────────────────

/**
 * Airtable returns "Link to another record" fields as string[] (an array of
 * Airtable record IDs, e.g. ["recXXXXXXXXXXXXXX"]) even when only one record
 * is linked. This helper safely extracts the first element so the rest of the
 * code can treat linked fields as plain strings.
 */
function resolveLinkedId(value: unknown): string {
  if (Array.isArray(value)) return (value as string[])[0] ?? '';
  if (typeof value === 'string') return value;
  return '';
}

// ─── Mappers: AirtableRecord<TFields> → domain model ─────────────────────────

function mapRestaurant(r: AirtableRecord<RestaurantFields>): Restaurant {
  return { _recordId: r.id, ...r.fields };
}

function mapCategory(r: AirtableRecord<CategoryFields>): Category {
  return { _recordId: r.id, ...r.fields };
}

/**
 * `category_id` on Items is a linked record field → normalise to a single
 * Airtable record ID string so composition can key on it safely.
 */
function mapItem(r: AirtableRecord<ItemFields>): Item {
  return {
    _recordId: r.id,
    ...r.fields,
    category_id: resolveLinkedId(r.fields.category_id),
  };
}

/**
 * `item_id` on Modifiers is a linked record field → same normalisation.
 */
function mapModifier(r: AirtableRecord<ModifierFields>): Modifier {
  return {
    _recordId: r.id,
    ...r.fields,
    item_id: resolveLinkedId(r.fields.item_id),
  };
}

// ─── Airtable fetch helper ────────────────────────────────────────────────────

async function airtableFetch<TFields>(
  tableName: string,
  formula: string,
  signal: AbortSignal
): Promise<AirtableRecord<TFields>[]> {
  const all: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const url =
      `${AIRTABLE_BASE_URL}/${encodeURIComponent(tableName)}` +
      `?filterByFormula=${encodeURIComponent(formula)}` +
      (offset ? `&offset=${encodeURIComponent(offset)}` : '');

    const res = await fetch(url, {
      signal,
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable [${tableName}] ${res.status}: ${body}`);
    }

    const data: AirtableListResponse<TFields> = await res.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

// ─── Airtable formula helpers ─────────────────────────────────────────────────

function singleEqual(field: string, value: string): string {
  return `{${field}}="${value}"`;
}

function orEqual(field: string, values: string[]): string {
  const conditions = values.map((v) => `{${field}}="${v}"`).join(',');
  return values.length === 1 ? conditions : `OR(${conditions})`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the full menu for a given restaurant slug from Airtable and
 * hydrates the Zustand store.
 *
 * Fetch sequence:
 *   Round 1 (parallel): Restaurants + Categories   — both filter by slug
 *   Round 2 (serial):   Items                      — filters by category_id list
 *   Round 3 (serial):   Modifiers                  — filters by item_id list
 *
 * Composition key insight (after normalisation):
 *   item.category_id  → Airtable record ID of the linked category  → matches cat._recordId
 *   mod.item_id       → Airtable record ID of the linked item       → matches item._recordId
 */
export function useFetchMenu(restaurantSlug: string): void {
  const setMenuPayload = useCartStore((s) => s.setMenuPayload);
  const setMenuLoading = useCartStore((s) => s.setMenuLoading);
  const setMenuError   = useCartStore((s) => s.setMenuError);
  const resetMenu      = useCartStore((s) => s.resetMenu);


  useEffect(() => {
    if (!restaurantSlug) return;

    // Reset cart + menu so a slug change never shows stale data.
    resetMenu();

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchMenu(): Promise<void> {
      setMenuLoading(true);
      setMenuError(null);

      try {
        // ── Round 1: restaurant + categories (parallel) ───────────────────────
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

        // ── Round 2: items, filtered by each category's custom category_id ────
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
        // After mapItem, item.category_id is now the Airtable record ID of the
        // linked category (e.g. "recABC123"), NOT the custom "cat_1" string.

        // ── Round 3: modifiers, filtered by each item's custom item_id ────────
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
        // After mapModifier, mod.item_id is the Airtable record ID of the
        // linked item (e.g. "recDEF456").

        // ── Compose: group modifiers by item._recordId ────────────────────────
        // mod.item_id (linked record ID) === item._recordId  ✓
        const modsByItemRecordId = new Map<string, Modifier[]>();
        for (const mod of modifiers) {
          const bucket = modsByItemRecordId.get(mod.item_id) ?? [];
          bucket.push(mod);
          modsByItemRecordId.set(mod.item_id, bucket);
        }

        // ── Compose: group items by item.category_id ──────────────────────────
        // item.category_id (linked record ID) === cat._recordId  ✓
        const itemsByCategoryRecordId = new Map<string, ItemWithModifiers[]>();
        for (const item of items) {
          const itemWithMods: ItemWithModifiers = {
            ...item,
            modifiers: modsByItemRecordId.get(item._recordId) ?? [],
          };
          const bucket = itemsByCategoryRecordId.get(item.category_id) ?? [];
          bucket.push(itemWithMods);
          itemsByCategoryRecordId.set(item.category_id, bucket);
        }

        // ── Compose: attach item lists to each category ───────────────────────
        const categoriesWithItems: CategoryWithItems[] = categories.map((cat) => ({
          ...cat,
          items: itemsByCategoryRecordId.get(cat._recordId) ?? [],
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
  }, [restaurantSlug, setMenuPayload, setMenuLoading, setMenuError, resetMenu]);
}
