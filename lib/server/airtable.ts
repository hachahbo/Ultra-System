// ─── Server-only Airtable helper ──────────────────────────────────────────────
// Runs exclusively inside Vercel serverless functions. Holds the WRITE-scoped
// token, which must NEVER be exposed to the browser. Do not import this file
// from any client/Expo code — it reads non-public env vars.

const TOKEN = process.env.AIRTABLE_TOKEN ?? '';
// Fall back to the public base id if a server-specific one is not set — the base
// id is not a secret, only the token is.
const BASE_ID =
  process.env.AIRTABLE_BASE_ID ?? process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID ?? '';
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

export interface AirtableRow<T> {
  id: string;
  createdTime: string;
  fields: T;
}

interface ListResponse<T> {
  records: AirtableRow<T>[];
  offset?: string;
}

function assertConfigured(): void {
  if (!TOKEN || !BASE_ID) {
    throw new Error('Airtable server env not configured (AIRTABLE_TOKEN / AIRTABLE_BASE_ID).');
  }
}

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${TOKEN}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/** Escape a value for safe interpolation into an Airtable filterByFormula string. */
export function escapeFormulaValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

/** List records with optional filter formula. Follows pagination fully. */
export async function listRecords<T>(
  table: string,
  opts: { filterByFormula?: string; sort?: { field: string; direction?: 'asc' | 'desc' }[] } = {}
): Promise<AirtableRow<T>[]> {
  assertConfigured();
  const all: AirtableRow<T>[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (opts.filterByFormula) params.set('filterByFormula', opts.filterByFormula);
    (opts.sort ?? []).forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      params.set(`sort[${i}][direction]`, s.direction ?? 'asc');
    });
    if (offset) params.set('offset', offset);

    const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}?${params}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Airtable list [${table}] ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as ListResponse<T>;
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

/** Create a single record and return it. */
export async function createRecord<T>(
  table: string,
  fields: Partial<T>
): Promise<AirtableRow<T>> {
  assertConfigured();
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`Airtable create [${table}] ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as AirtableRow<T>;
}

/** Patch a single record by its Airtable record id. */
export async function updateRecord<T>(
  table: string,
  recordId: string,
  fields: Partial<T>
): Promise<AirtableRow<T>> {
  assertConfigured();
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    throw new Error(`Airtable update [${table}] ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as AirtableRow<T>;
}
