import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.116.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function handleError(error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (status >= 500) console.error(error);
  return json({ error: message }, status);
}

export interface RequestContext {
  user: User;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

function namedKeyFromJson(environmentName: string, keyName = "default"): string | undefined {
  const raw = Deno.env.get(environmentName);
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const value = (parsed as Record<string, unknown>)[keyName];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function serverKeys(): { publishableKey: string | undefined; secretKey: string | undefined } {
  return {
    publishableKey:
      namedKeyFromJson("SUPABASE_PUBLISHABLE_KEYS") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY"),
    secretKey:
      namedKeyFromJson("SUPABASE_SECRET_KEYS") ??
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export async function requireUser(req: Request): Promise<RequestContext> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const { publishableKey, secretKey } = serverKeys();
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !publishableKey || !secretKey) throw new HttpError(500, "Supabase server configuration is incomplete.");
  if (!authorization.startsWith("Bearer ")) throw new HttpError(401, "Authentication required.");

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session.");

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user: data.user, userClient, adminClient };
}

export async function requireAdmin(ctx: RequestContext): Promise<void> {
  const { data, error } = await ctx.adminClient
    .from("profiles")
    .select("role,account_status")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to verify administrator account.");
  if (data?.role !== "admin" || data?.account_status !== "active") throw new HttpError(403, "Administrator access required.");
}

export function cleanText(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

