# SariPOS Cloud Authentication, Licensing, and Backup

## Status

Implemented in the `0.9.0-native-dev` source track. The Android app, Supabase migration, Edge Functions, and browser administrator dashboard are present in the repository. Production use still requires a dedicated SariPOS Supabase project, OAuth credentials, signing keys, secrets, deployed functions, and a CI-built APK containing the public configuration. Do not connect this migration to an unrelated project.

## Customer access flow

1. The customer chooses **Continue with Google** or **Continue with Facebook** in Android.
2. Supabase Auth verifies the social login and creates a `profiles` row with `pending` status.
3. A SariPOS administrator chooses the plan, store name, expiration, device allowance, offline allowance, and backup allowance.
4. The license server atomically claims one device slot. Concurrent first logins cannot exceed the configured limit.
5. The server returns a short-lived, RSA-signed offline license bound to that account, store, license, and installation key.
6. Android verifies the signature with the embedded public key and encrypts the cached token with Android Keystore.
7. Expired, suspended, cancelled, revoked, pending, or over-limit access is blocked. An already verified device can continue only until its signed offline allowance ends.

The installation and its local SQLite data are bound to the first approved store. Signing out does not erase that binding. A different account may open the data only if it belongs to the same store; moving the phone to another store requires an intentional app-data clear/reinstall and device-slot administration. This prevents a second customer's valid account from exposing the previous store's local records.

The device key is derived from a random app-installation identifier and Android ID, then hashed. SariPOS does not request IMEI, phone-number, contacts, or storage-wide permission.

## Plans and payment controls

The migration seeds editable `trial`, `basic`, `standard`, `business`, and `lifetime` plan records. A plan can define duration, default device limit, offline days, backup count, backup retention, and feature flags. A license can override device, offline, backup, and feature values for one store.

Payment records contain amount in centavos, method, reference, notes, store, license, recording administrator, and time. Recording payment is an audit record; activation is still an explicit administrator decision so an incorrect or unconfirmed payment cannot automatically unlock the app. The admin dashboard supports initial approval, activation/suspension, package/device/expiry editing, manual payment recording, and device revocation.

Prices are intentionally not hard-coded in the seed migration. Set final prices in `public.plans` after deciding the commercial packages.

## Backup boundary

Cloud backup is not a general-purpose file drive.

- Android sends only the JSON produced by `PosStore.exportBackup()`; there is no cloud file-picker upload.
- The Edge Function rejects invalid JSON, unexpected root fields, other formats, unsupported schema versions, unknown tables, unknown columns, nested/file values, excessive text, excessive rows, and payloads over 5 MB.
- Accepted content type is `application/vnd.saripos.backup+json` in the private `saripos-backups` bucket.
- Objects are written by the server under `<user-id>/<store-id>/<year>/<month>/...pos`; customers cannot choose a path.
- Direct authenticated client upload/update/delete policies are absent. Download is routed through the function, which rechecks membership, format, and SHA-256 integrity.
- Plan backup-count and retention limits are applied before a new upload.
- Only an owner or manager can delete a backup.

Local Android export/restore remains available through the system document picker and is separate from cloud backup.

## Supabase setup

1. Create a dedicated Supabase project for SariPOS.
2. Link the repository's `supabase/` directory to that project and apply `supabase/migrations/20260908000000_saripos_cloud_foundation.sql`.
3. Enable Google and/or Facebook in **Authentication → Providers**. Configure each provider's client credentials and the callback URL shown by Supabase.
4. Add `saripos://auth/callback` and the final HTTPS URL of `admin/index.html` to the permitted redirect URLs.
5. Run `scripts/generate-license-keys.sh <secure-directory>` once. Keep `saripos-license-private.pem` outside Git and all public folders.
6. Set Edge Function secrets:

   ```bash
   supabase secrets set LICENSE_PRIVATE_KEY="$(cat <secure-directory>/saripos-license-private.pem)"
   ```

   Hosted Edge Functions receive `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, and `SUPABASE_SECRET_KEYS` automatically. The plural key values are JSON dictionaries and the functions read their `default` entries. Legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain supported for local or transitional deployments.
7. Deploy `license-status`, `backups`, and `admin-license` with platform JWT verification disabled. Each function still fails closed: `requireUser()` validates the caller's Bearer session through Supabase Auth before any license or backup operation, and `requireAdmin()` additionally checks the protected administrator profile.
8. Promote one trusted user to administrator directly in SQL after that user signs in:

   ```sql
   update public.profiles
   set role = 'admin', account_status = 'active'
   where email = 'owner@example.com';
   ```

9. Open `admin/index.html` through HTTPS, enter only the project URL and publishable key, then sign in with the administrator Google account. Never put a secret/service-role key in the dashboard or Android app.
10. Set GitHub repository secrets `SARIPOS_SUPABASE_URL`, `SARIPOS_SUPABASE_PUBLISHABLE_KEY`, and `SARIPOS_LICENSE_PUBLIC_KEY`, then run the Android workflow to produce the configured APK.

## Key rotation and operational notes

Rotating the RSA key invalidates old offline licenses after the Android public key changes. Deploy the private key to Supabase and the matching public key to Android together. Never log access tokens, private keys, backup bodies, or service-role keys.

An Android build with all three cloud settings empty stays in development/offline mode so source checks can run before deployment. If any cloud value is present, Android fails closed until the project URL, publishable key, and RSA public key are all valid. A customer-distributed licensing build must contain all three values.

## Production acceptance checklist

- Google login and Facebook login return to `saripos://auth/callback`.
- A new account remains pending until admin approval.
- Device limit 1 rejects a second installation; revoking the old device permits the replacement only after admin action.
- Expired/suspended licenses stop after their signed offline allowance.
- Each plan's device, expiration, backup-count, retention, and feature settings behave as configured.
- Arbitrary files, renamed images, nested JSON, unsupported tables/columns, and payloads over 5 MB are rejected.
- One account cannot list, download, or delete another store's backups.
- Modified backup contents fail SHA-256 verification before restore.
- No secret/service-role/private signing key is present in APKs, web assets, Git history, or logs.
