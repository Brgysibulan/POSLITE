import { HttpError } from "./http.ts";

const tableColumns: Record<string, Set<string>> = {
  products: new Set(["id", "name", "category", "barcode", "base_unit", "stock_base", "low_stock_base", "avg_cost_base", "created_at", "updated_at"]),
  product_units: new Set(["id", "product_id", "label", "qty_base", "sell_price", "sale_enabled", "purchase_enabled"]),
  customers: new Set(["id", "name", "contact", "balance", "created_at", "updated_at"]),
  sales: new Set(["id", "number", "created_at", "subtotal", "discount", "total", "payment_type", "customer_id", "customer_name", "cash", "change_amount", "status", "voided_at", "void_reason"]),
  sale_items: new Set(["id", "sale_id", "product_id", "product_name", "unit_label", "qty", "qty_base", "unit_price", "cost_base", "amount"]),
  purchases: new Set(["id", "number", "supplier", "created_at", "total_cost"]),
  purchase_items: new Set(["id", "purchase_id", "product_id", "unit_label", "qty", "qty_base", "total_cost"]),
  stock_movements: new Set(["id", "product_id", "movement_type", "qty_base", "created_at", "reference", "note", "cost_base"]),
  credit_ledger: new Set(["id", "customer_id", "entry_type", "amount", "created_at", "reference"]),
  expenses: new Set(["id", "created_at", "category", "description", "amount"]),
  cash_closings: new Set(["id", "period_start", "closed_at", "opening_cash", "cash_sales", "credit_payments", "expenses", "expected_cash", "actual_cash", "variance", "note"]),
  settings: new Set(["key", "value"]),
  draft_cart: new Set(["product_id", "unit_id", "qty"]),
};

const maximumRows: Record<string, number> = {
  products: 20000, product_units: 100000, customers: 50000, sales: 200000,
  sale_items: 1000000, purchases: 200000, purchase_items: 1000000,
  stock_movements: 1000000, credit_ledger: 500000, expenses: 500000,
  cash_closings: 10000, settings: 200, draft_cart: 500,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function validateScalar(value: unknown, table: string, column: string): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new HttpError(400, `Invalid number in ${table}.${column}.`);
    return;
  }
  if (typeof value === "string") {
    if (value.length > 10000) throw new HttpError(400, `Text is too long in ${table}.${column}.`);
    if (/\u0000/.test(value)) throw new HttpError(400, `Invalid text in ${table}.${column}.`);
    return;
  }
  throw new HttpError(400, `Unsupported value in ${table}.${column}.`);
}

export interface ValidatedBackup {
  text: string;
  root: Record<string, unknown>;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string | null;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateBackup(input: unknown): ValidatedBackup {
  const root = typeof input === "string"
    ? (() => { try { return JSON.parse(input); } catch { throw new HttpError(400, "Backup is not valid JSON."); } })()
    : input;
  if (!isPlainObject(root)) throw new HttpError(400, "Backup must be a JSON object.");
  const allowedRootKeys = new Set(["format", "schemaVersion", "appVersion", "exportedAt", "tables"]);
  if (Object.keys(root).some((key) => !allowedRootKeys.has(key))) throw new HttpError(400, "Backup has unsupported root fields.");
  if (root.format !== "SariPOS-Android") throw new HttpError(400, "This is not a SariPOS Android backup.");
  const schemaVersion = Number(root.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 3) throw new HttpError(400, "Unsupported backup schema.");
  const appVersion = typeof root.appVersion === "string" ? root.appVersion.slice(0, 64) : "unknown";
  if (!isPlainObject(root.tables)) throw new HttpError(400, "Backup tables are missing.");
  if (Object.keys(root.tables).some((table) => !tableColumns[table])) throw new HttpError(400, "Backup contains an unsupported table.");

  for (const [table, columns] of Object.entries(tableColumns)) {
    const rows = root.tables[table];
    if (table === "cash_closings" && schemaVersion < 3 && rows === undefined) continue;
    if (!Array.isArray(rows)) throw new HttpError(400, `Required table ${table} is missing.`);
    if (rows.length > maximumRows[table]) throw new HttpError(413, `Too many rows in ${table}.`);
    for (const row of rows) {
      if (!isPlainObject(row)) throw new HttpError(400, `Invalid row in ${table}.`);
      for (const [column, value] of Object.entries(row)) {
        if (!columns.has(column)) throw new HttpError(400, `Unsupported column ${table}.${column}.`);
        validateScalar(value, table, column);
      }
    }
  }

  const text = JSON.stringify(root);
  const size = new TextEncoder().encode(text).byteLength;
  if (size <= 0 || size > 5 * 1024 * 1024) throw new HttpError(413, "Backup exceeds the 5 MB upload limit.");
  const exportedAtMs = Number(root.exportedAt);
  const exportedDate = Number.isFinite(exportedAtMs) && exportedAtMs > 0 ? new Date(exportedAtMs) : null;
  const exportedAt = exportedDate !== null && Number.isFinite(exportedDate.getTime()) ? exportedDate.toISOString() : null;
  return { text, root, schemaVersion, appVersion, exportedAt };
}
