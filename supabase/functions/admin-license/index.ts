import { cleanText, corsHeaders, handleError, HttpError, isUuid, json, requireAdmin, requireUser } from "../_shared/http.ts";

function optionalPositiveInt(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, `${field} must be a positive whole number.`);
  return number;
}

function optionalNonNegativeInt(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 10000) throw new HttpError(400, `${field} must be a whole number from 0 to 10000.`);
  return number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const ctx = await requireUser(req);
    await requireAdmin(ctx);
    const body = await req.json();
    const action = String(body.action ?? "list");

    if (action === "list") {
      const [profiles, stores, licenses, devices, plans, payments] = await Promise.all([
        ctx.adminClient.from("profiles").select("id,email,display_name,account_status,created_at").order("created_at", { ascending: false }),
        ctx.adminClient.from("stores").select("*").order("created_at", { ascending: false }),
        ctx.adminClient.from("licenses").select("*,plans(display_name)").order("created_at", { ascending: false }),
        ctx.adminClient.from("devices").select("*").order("last_seen_at", { ascending: false }),
        ctx.adminClient.from("plans").select("*").order("created_at"),
        ctx.adminClient.from("payments").select("*").order("paid_at", { ascending: false }).limit(200),
      ]);
      const firstError = [profiles, stores, licenses, devices, plans, payments].find((result) => result.error)?.error;
      if (firstError) throw new HttpError(500, "Unable to load administrator data.");
      return json({ profiles: profiles.data, stores: stores.data, licenses: licenses.data, devices: devices.data, plans: plans.data, payments: payments.data });
    }

    if (action === "approve") {
      if (!isUuid(body.userId)) throw new HttpError(400, "Invalid user ID.");
      const storeName = cleanText(body.storeName, 120);
      const planCode = cleanText(body.planCode, 50);
      if (!storeName || !planCode) throw new HttpError(400, "Store name and plan are required.");
      const { data: plan } = await ctx.adminClient.from("plans").select("code,duration_days").eq("code", planCode).eq("is_active", true).maybeSingle();
      if (!plan) throw new HttpError(400, "Plan not found.");

      let { data: membership } = await ctx.adminClient.from("store_members").select("store_id").eq("user_id", body.userId).eq("member_role", "owner").limit(1).maybeSingle();
      let storeId = membership?.store_id as string | undefined;
      if (!storeId) {
        const { data: store, error: storeError } = await ctx.adminClient.from("stores").insert({ owner_user_id: body.userId, name: storeName, status: "active" }).select("id").single();
        if (storeError || !store) throw new HttpError(500, "Unable to create store.");
        storeId = store.id;
        const { error: memberError } = await ctx.adminClient.from("store_members").insert({ store_id: storeId, user_id: body.userId, member_role: "owner" });
        if (memberError) throw new HttpError(500, "Unable to create store membership.");
      } else {
        await ctx.adminClient.from("stores").update({ name: storeName, status: "active", updated_at: new Date().toISOString() }).eq("id", storeId);
      }

      const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
      if (!Number.isFinite(startsAt.getTime())) throw new HttpError(400, "Invalid start date.");
      let expiresAt: string | null = null;
      if (body.expiresAt) {
        const parsed = new Date(body.expiresAt);
        if (!Number.isFinite(parsed.getTime()) || parsed <= startsAt) throw new HttpError(400, "Invalid expiration date.");
        expiresAt = parsed.toISOString();
      } else if (plan.duration_days) {
        expiresAt = new Date(startsAt.getTime() + Number(plan.duration_days) * 86400000).toISOString();
      }

      const licenseValues = {
        store_id: storeId,
        plan_code: planCode,
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt,
        max_devices_override: optionalPositiveInt(body.maxDevices, "Device limit"),
        offline_grace_days_override: optionalPositiveInt(body.offlineGraceDays, "Offline allowance"),
        backup_limit_override: optionalNonNegativeInt(body.backupLimit, "Backup limit"),
        notes: cleanText(body.notes, 1000),
        approved_by: ctx.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: license, error: licenseError } = await ctx.adminClient.from("licenses").upsert(licenseValues, { onConflict: "store_id" }).select("*").single();
      if (licenseError || !license) throw new HttpError(500, "Unable to activate license.");
      await ctx.adminClient.from("profiles").update({ account_status: "active", updated_at: new Date().toISOString() }).eq("id", body.userId);
      await ctx.adminClient.from("audit_logs").insert({ actor_user_id: ctx.user.id, store_id: storeId, action: "license.approved", entity_type: "license", entity_id: license.id, details: { plan_code: planCode, expires_at: expiresAt } });
      return json({ storeId, license });
    }

    if (action === "set-license") {
      if (!isUuid(body.licenseId)) throw new HttpError(400, "Invalid license ID.");
      const allowedStatuses = ["pending", "active", "expired", "suspended", "cancelled"];
      const status = String(body.status ?? "");
      if (!allowedStatuses.includes(status)) throw new HttpError(400, "Invalid license status.");
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (body.planCode) {
        const planCode = cleanText(body.planCode, 50);
        const { data: plan } = await ctx.adminClient.from("plans").select("code").eq("code", planCode).eq("is_active", true).maybeSingle();
        if (!plan) throw new HttpError(400, "Plan not found.");
        updates.plan_code = planCode;
      }
      if ("expiresAt" in body) {
        if (body.expiresAt) {
          const expiresAt = new Date(body.expiresAt);
          if (!Number.isFinite(expiresAt.getTime())) throw new HttpError(400, "Invalid expiration date.");
          updates.expires_at = expiresAt.toISOString();
        } else updates.expires_at = null;
      }
      if ("maxDevices" in body) updates.max_devices_override = body.maxDevices === null ? null : optionalPositiveInt(body.maxDevices, "Device limit");
      if ("offlineGraceDays" in body) updates.offline_grace_days_override = body.offlineGraceDays === null ? null : optionalPositiveInt(body.offlineGraceDays, "Offline allowance");
      if ("backupLimit" in body) updates.backup_limit_override = optionalNonNegativeInt(body.backupLimit, "Backup limit");
      const { data, error } = await ctx.adminClient.from("licenses").update(updates).eq("id", body.licenseId).select("*").single();
      if (error) throw new HttpError(500, "Unable to update license.");
      await ctx.adminClient.from("audit_logs").insert({ actor_user_id: ctx.user.id, store_id: data.store_id, action: "license.updated", entity_type: "license", entity_id: data.id, details: updates });
      return json({ license: data });
    }

    if (action === "revoke-device") {
      if (!isUuid(body.deviceId)) throw new HttpError(400, "Invalid device ID.");
      const { data, error } = await ctx.adminClient.from("devices").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", body.deviceId).select("*").single();
      if (error) throw new HttpError(500, "Unable to revoke device.");
      await ctx.adminClient.from("audit_logs").insert({ actor_user_id: ctx.user.id, store_id: data.store_id, action: "device.revoked", entity_type: "device", entity_id: data.id });
      return json({ device: data });
    }

    if (action === "record-payment") {
      if (!isUuid(body.storeId)) throw new HttpError(400, "Invalid store ID.");
      const amountCentavos = Number(body.amountCentavos);
      if (!Number.isInteger(amountCentavos) || amountCentavos < 0) throw new HttpError(400, "Invalid payment amount.");
      const { data, error } = await ctx.adminClient.from("payments").insert({
        store_id: body.storeId,
        license_id: isUuid(body.licenseId) ? body.licenseId : null,
        amount_centavos: amountCentavos,
        payment_method: cleanText(body.paymentMethod, 50) || "manual",
        reference: cleanText(body.reference, 120),
        notes: cleanText(body.notes, 1000),
        recorded_by: ctx.user.id,
      }).select("*").single();
      if (error) throw new HttpError(500, "Unable to record payment.");
      await ctx.adminClient.from("audit_logs").insert({ actor_user_id: ctx.user.id, store_id: body.storeId, action: "payment.recorded", entity_type: "payment", entity_id: data.id, details: { amount_centavos: amountCentavos } });
      return json({ payment: data }, 201);
    }

    throw new HttpError(400, "Unknown administrator action.");
  } catch (error) {
    return handleError(error);
  }
});
