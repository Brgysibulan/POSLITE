import { corsHeaders, handleError, HttpError, isUuid, json, requireUser } from "../_shared/http.ts";
import { activateDevice } from "../_shared/license.ts";
import { sha256Hex, validateBackup } from "../_shared/backup-validation.ts";

const bucket = "saripos-backups";

async function listBackups(ctx: Awaited<ReturnType<typeof requireUser>>, storeId: unknown) {
  if (!isUuid(storeId)) throw new HttpError(400, "Invalid store ID.");
  const { data: membership } = await ctx.adminClient.from("store_members").select("member_role").eq("store_id", storeId).eq("user_id", ctx.user.id).maybeSingle();
  if (!membership) throw new HttpError(403, "Store access denied.");
  const { data, error } = await ctx.adminClient
    .from("backups")
    .select("id,backup_kind,schema_version,app_version,checksum_sha256,size_bytes,exported_at,created_at,devices(device_name)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Unable to list backups.");
  return data ?? [];
}

async function pruneBackups(ctx: Awaited<ReturnType<typeof requireUser>>, storeId: string, limit: number, retentionDays: number | null) {
  const { data } = await ctx.adminClient
    .from("backups")
    .select("id,storage_path,created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  const cutoff = retentionDays === null ? null : Date.now() - retentionDays * 86400000;
  const expired = (data ?? []).filter((item, index) =>
    index >= limit || (cutoff !== null && new Date(item.created_at).getTime() < cutoff)
  );
  if (!expired.length) return;
  const { error: removeError } = await ctx.adminClient.storage.from(bucket).remove(expired.map((item) => item.storage_path));
  if (removeError) {
    console.error("Unable to prune backup objects", removeError);
    return;
  }
  const { error: deleteError } = await ctx.adminClient.from("backups").delete().in("id", expired.map((item) => item.id));
  if (deleteError) console.error("Unable to prune backup metadata", deleteError);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireUser(req);
    const body = req.method === "GET"
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json();
    const action = String(body.action ?? (req.method === "GET" ? "list" : "upload"));

    if (action === "list") return json({ backups: await listBackups(ctx, body.storeId) });

    if (action === "upload") {
      const license = await activateDevice(ctx, body);
      if (license.features.cloud_backup !== true || license.backupLimit <= 0) throw new HttpError(403, "Cloud backup is not included in this plan.");
      const validated = validateBackup(body.backup);
      const checksum = await sha256Hex(validated.text);
      const created = new Date();
      const kind = body.kind === "automatic" ? "automatic" : "manual";
      const path = `${ctx.user.id}/${license.store.id}/${created.getUTCFullYear()}/${String(created.getUTCMonth() + 1).padStart(2, "0")}/${created.toISOString().replaceAll(":", "-")}-${crypto.randomUUID()}.pos`;
      const bytes = new TextEncoder().encode(validated.text);
      const { error: uploadError } = await ctx.adminClient.storage.from(bucket).upload(path, bytes, {
        contentType: "application/vnd.saripos.backup+json",
        upsert: false,
      });
      if (uploadError) throw new HttpError(500, "Unable to store backup.");

      const { data: record, error: recordError } = await ctx.adminClient.from("backups").insert({
        store_id: license.store.id,
        user_id: ctx.user.id,
        device_id: license.device.id,
        storage_path: path,
        backup_kind: kind,
        schema_version: validated.schemaVersion,
        app_version: validated.appVersion,
        checksum_sha256: checksum,
        size_bytes: bytes.byteLength,
        exported_at: validated.exportedAt,
      }).select("id,backup_kind,schema_version,app_version,checksum_sha256,size_bytes,exported_at,created_at").single();
      if (recordError || !record) {
        await ctx.adminClient.storage.from(bucket).remove([path]);
        throw new HttpError(500, "Unable to record backup.");
      }
      await ctx.adminClient.from("audit_logs").insert({
        actor_user_id: ctx.user.id,
        store_id: license.store.id,
        action: "backup.created",
        entity_type: "backup",
        entity_id: record.id,
        details: { kind, size_bytes: bytes.byteLength, checksum_sha256: checksum },
      });
      await pruneBackups(ctx, license.store.id, license.backupLimit, license.backupRetentionDays);
      return json({ backup: record }, 201);
    }

    if (action === "download") {
      if (!isUuid(body.backupId)) throw new HttpError(400, "Invalid backup ID.");
      const { data: record, error } = await ctx.adminClient
        .from("backups")
        .select("id,store_id,storage_path,checksum_sha256")
        .eq("id", body.backupId)
        .maybeSingle();
      if (error || !record) throw new HttpError(404, "Backup not found.");
      const { data: membership } = await ctx.adminClient.from("store_members").select("member_role").eq("store_id", record.store_id).eq("user_id", ctx.user.id).maybeSingle();
      if (!membership) throw new HttpError(403, "Store access denied.");
      const { data: file, error: downloadError } = await ctx.adminClient.storage.from(bucket).download(record.storage_path);
      if (downloadError || !file) throw new HttpError(500, "Unable to download backup.");
      const text = await file.text();
      validateBackup(text);
      if (await sha256Hex(text) !== record.checksum_sha256) throw new HttpError(409, "Backup integrity check failed.");
      return new Response(text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/vnd.saripos.backup+json", "Cache-Control": "no-store" },
      });
    }

    if (action === "delete") {
      if (!isUuid(body.backupId)) throw new HttpError(400, "Invalid backup ID.");
      const { data: record } = await ctx.adminClient.from("backups").select("id,store_id,storage_path").eq("id", body.backupId).maybeSingle();
      if (!record) throw new HttpError(404, "Backup not found.");
      const { data: membership } = await ctx.adminClient.from("store_members").select("member_role").eq("store_id", record.store_id).eq("user_id", ctx.user.id).maybeSingle();
      if (!membership || !["owner", "manager"].includes(membership.member_role)) throw new HttpError(403, "Only an owner or manager can delete backups.");
      const { error: removeError } = await ctx.adminClient.storage.from(bucket).remove([record.storage_path]);
      if (removeError) throw new HttpError(500, "Unable to remove backup file.");
      await ctx.adminClient.from("backups").delete().eq("id", record.id);
      await ctx.adminClient.from("audit_logs").insert({ actor_user_id: ctx.user.id, store_id: record.store_id, action: "backup.deleted", entity_type: "backup", entity_id: record.id });
      return json({ deleted: true });
    }

    throw new HttpError(400, "Unknown backup action.");
  } catch (error) {
    return handleError(error);
  }
});
