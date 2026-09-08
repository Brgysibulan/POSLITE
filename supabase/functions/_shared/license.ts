import type { RequestContext } from "./http.ts";
import { HttpError, cleanText, isUuid } from "./http.ts";

export interface LicenseContext {
  membership: { store_id: string; member_role: string };
  store: { id: string; name: string; status: string };
  license: Record<string, unknown>;
  plan: Record<string, unknown>;
  device: Record<string, unknown>;
  maxDevices: number;
  offlineGraceDays: number;
  backupLimit: number;
  backupRetentionDays: number | null;
  features: Record<string, unknown>;
}

function asObject(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] ?? {}) as Record<string, unknown>;
  return (value ?? {}) as Record<string, unknown>;
}

export async function activateDevice(
  ctx: RequestContext,
  input: { storeId?: unknown; deviceKey: unknown; deviceName?: unknown },
): Promise<LicenseContext> {
  const deviceKey = cleanText(input.deviceKey, 160);
  if (deviceKey.length < 16) throw new HttpError(400, "Invalid device key.");

  if (input.storeId !== undefined && !isUuid(input.storeId)) throw new HttpError(400, "Invalid store ID.");
  const { data, error } = await ctx.adminClient.rpc("server_activate_device", {
    p_user_id: ctx.user.id,
    p_store_id: input.storeId ?? null,
    p_device_key: deviceKey,
    p_device_name: cleanText(input.deviceName, 100) || "Android device",
  });
  if (error) {
    const knownReason = [
      "pending_approval", "device_limit_reached", "device_revoked", "license_not_started",
      "license_expired", "license_pending", "license_suspended", "license_cancelled",
      "store_pending", "store_suspended", "plan_unavailable",
    ].find((reason) => error.message.includes(reason));
    if (knownReason) throw new HttpError(403, knownReason);
    throw new HttpError(500, "Unable to activate device.");
  }
  const result = asObject(data);
  const membership = asObject(result.membership) as { store_id: string; member_role: string };
  const store = asObject(result.store) as { id: string; name: string; status: string };
  const license = asObject(result.license);
  const plan = asObject(result.plan);
  const device = asObject(result.device);
  const maxDevices = Number(result.max_devices ?? 1);
  const offlineGraceDays = Number(result.offline_grace_days ?? 7);
  const backupLimit = Number(result.backup_limit ?? 0);
  const retentionValue = result.backup_retention_days;
  const backupRetentionDays = retentionValue === null || retentionValue === undefined ? null : Number(retentionValue);
  const features = asObject(result.features);

  if (result.is_new_device === true) {
    await ctx.adminClient.from("audit_logs").insert({
      actor_user_id: ctx.user.id,
      store_id: store.id,
      action: "device.activated",
      entity_type: "device",
      entity_id: device.id,
      details: { device_name: device.device_name },
    });
  }

  return { membership, store, license, plan, device, maxDevices, offlineGraceDays, backupLimit, backupRetentionDays, features };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodePem(value: string): Uint8Array {
  const base64 = value.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  if (!base64) throw new HttpError(500, "License signing key is missing.");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createSignedLicenseToken(ctx: LicenseContext, userId: string, deviceKey: string): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const licenseExpiry = typeof ctx.license.expires_at === "string"
    ? Math.floor(new Date(ctx.license.expires_at).getTime() / 1000)
    : null;
  const graceExpiry = nowSeconds + ctx.offlineGraceDays * 86400;
  const validUntil = licenseExpiry === null ? graceExpiry : Math.min(graceExpiry, licenseExpiry);
  const payload = {
    v: 1,
    sub: userId,
    store_id: ctx.store.id,
    store_name: ctx.store.name,
    license_id: ctx.license.id,
    plan_code: ctx.license.plan_code,
    device_key: deviceKey,
    max_devices: ctx.maxDevices,
    features: ctx.features,
    iat: nowSeconds,
    refresh_after: Math.min(validUntil, nowSeconds + Math.max(1, Math.floor(ctx.offlineGraceDays / 2)) * 86400),
    valid_until: validUntil,
    license_expires_at: licenseExpiry,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const privateKeyBytes = decodePem(Deno.env.get("LICENSE_PRIVATE_KEY") ?? "");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, payloadBytes));
  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
}
