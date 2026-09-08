import { corsHeaders, handleError, json, requireUser } from "../_shared/http.ts";
import { activateDevice, createSignedLicenseToken } from "../_shared/license.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const ctx = await requireUser(req);
    const body = await req.json();
    const license = await activateDevice(ctx, body);
    const token = await createSignedLicenseToken(license, ctx.user.id, String(body.deviceKey));
    return json({
      status: "active",
      account: { id: ctx.user.id, email: ctx.user.email },
      store: license.store,
      license: {
        id: license.license.id,
        planCode: license.license.plan_code,
        expiresAt: license.license.expires_at,
        maxDevices: license.maxDevices,
        offlineGraceDays: license.offlineGraceDays,
        backupLimit: license.backupLimit,
        features: license.features,
      },
      device: { id: license.device.id, name: license.device.device_name },
      token,
    });
  } catch (error) {
    return handleError(error);
  }
});

