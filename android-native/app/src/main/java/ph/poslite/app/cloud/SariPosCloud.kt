package ph.poslite.app.cloud

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Facebook
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.createSupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import ph.poslite.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

enum class LoginProvider { GOOGLE, FACEBOOK }

data class LicenseSnapshot(
    val userId: String,
    val storeId: String,
    val storeName: String,
    val licenseId: String,
    val planCode: String,
    val deviceKey: String,
    val maxDevices: Int,
    val refreshAfter: Long,
    val validUntil: Long,
    val licenseExpiresAt: Long?,
    val features: Map<String, Boolean>
) {
    fun isValid(nowSeconds: Long = System.currentTimeMillis() / 1000): Boolean = validUntil > nowSeconds
}

data class CloudBackup(
    val id: String,
    val kind: String,
    val appVersion: String,
    val sizeBytes: Int,
    val exportedAt: String?,
    val createdAt: String
)

sealed interface CloudAccessState {
    data object Disabled : CloudAccessState
    data object Checking : CloudAccessState
    data object SignedOut : CloudAccessState
    data class Active(val license: LicenseSnapshot, val offline: Boolean) : CloudAccessState
    data class Blocked(val reason: String) : CloudAccessState
    data class Error(val message: String) : CloudAccessState
}

object SariPosCloud {
    val enforcementEnabled: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() ||
            BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank() ||
            BuildConfig.SARIPOS_LICENSE_PUBLIC_KEY.isNotBlank()

    val configured: Boolean
        get() = BuildConfig.SUPABASE_URL.startsWith("https://") &&
            BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank() &&
            BuildConfig.SARIPOS_LICENSE_PUBLIC_KEY.isNotBlank()

    val events = MutableSharedFlow<Unit>(extraBufferCapacity = 2)

    val client: SupabaseClient? by lazy {
        if (!configured) null else createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY
        ) {
            install(Auth) {
                flowType = FlowType.PKCE
                scheme = "saripos"
                host = "auth"
            }
        }
    }
}

class CloudController(context: Context) {
    private val appContext = context.applicationContext
    private val secureStore = SecureLicenseStore(appContext)
    private val installationStore = appContext.getSharedPreferences("saripos.cloud", Context.MODE_PRIVATE)
    private val api = CloudApi()
    val deviceKey: String = loadDeviceKey(appContext)

    var state by mutableStateOf<CloudAccessState>(
        when {
            SariPosCloud.configured -> CloudAccessState.Checking
            SariPosCloud.enforcementEnabled -> CloudAccessState.Error("Kulang ang SariPOS cloud configuration sa APK.")
            else -> CloudAccessState.Disabled
        }
    )
        private set
    var accountEmail by mutableStateOf("")
        private set
    var backups by mutableStateOf(emptyList<CloudBackup>())
        private set
    var working by mutableStateOf(false)
        private set

    suspend fun initialize() {
        if (!SariPosCloud.configured) {
            state = if (SariPosCloud.enforcementEnabled) {
                CloudAccessState.Error("Kulang ang SariPOS cloud configuration sa APK.")
            } else CloudAccessState.Disabled
            return
        }
        state = CloudAccessState.Checking
        val cached = secureStore.readVerified(deviceKey)?.takeIf { bindOrMatchStore(it.storeId) }
        if (cached != null) state = CloudAccessState.Active(cached, offline = true)
        val client = SariPosCloud.client ?: return
        runCatching { client.auth.awaitInitialization() }
        val session = client.auth.currentSessionOrNull()
        if (session == null) {
            if (cached == null) state = CloudAccessState.SignedOut
            return
        }
        accountEmail = session.user?.email.orEmpty()
        refreshLicense()
    }

    suspend fun signIn(provider: LoginProvider) {
        val client = SariPosCloud.client ?: return
        working = true
        state = CloudAccessState.Checking
        runCatching {
            when (provider) {
                LoginProvider.GOOGLE -> client.auth.signInWith(Google)
                LoginProvider.FACEBOOK -> client.auth.signInWith(Facebook)
            }
        }.onFailure { state = CloudAccessState.Error(it.message ?: "Hindi mabuksan ang login.") }
        working = false
    }

    suspend fun signOut() {
        working = true
        runCatching { SariPosCloud.client?.auth?.signOut() }
        secureStore.clear()
        accountEmail = ""
        backups = emptyList()
        state = CloudAccessState.SignedOut
        working = false
    }

    suspend fun refreshLicense() {
        val client = SariPosCloud.client ?: return
        val accessToken = client.auth.currentAccessTokenOrNull()
        if (accessToken.isNullOrBlank()) {
            if (secureStore.readVerified(deviceKey) == null) state = CloudAccessState.SignedOut
            return
        }
        working = true
        val request = JSONObject()
            .put("deviceKey", deviceKey)
            .put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
        installationStore.getString("bound_store_id", null)?.let { request.put("storeId", it) }
        runCatching { api.post("license-status", accessToken, request) }
            .onSuccess { response ->
                val token = response.getString("token")
                val license = LicenseTokenVerifier.verify(token, deviceKey)
                    ?: error("Hindi ma-verify ang license signature.")
                if (!bindOrMatchStore(license.storeId)) {
                    secureStore.clear()
                    state = CloudAccessState.Blocked("May local data ang phone na ito mula sa ibang tindahan. I-clear ang app data bago ilipat sa ibang store.")
                    return@onSuccess
                }
                secureStore.save(token)
                accountEmail = response.optJSONObject("account")?.optString("email").orEmpty()
                state = CloudAccessState.Active(license, offline = false)
            }
            .onFailure { error ->
                val cached = secureStore.readVerified(deviceKey)
                if (error is CloudHttpException) {
                    val reason = if (error.serverMessage == "pending_approval" && installationStore.contains("bound_store_id")) {
                        "Hindi kabilang sa naka-bind na tindahan ang account na ito. I-clear ang app data bago ilipat sa ibang store."
                    } else friendlyReason(error.serverMessage)
                    if (error.code in 400..499 && error.code != 401) {
                        secureStore.clear()
                        state = CloudAccessState.Blocked(reason)
                    } else if (cached != null) {
                        state = CloudAccessState.Active(cached, offline = true)
                    } else {
                        state = if (error.code == 401) CloudAccessState.SignedOut else CloudAccessState.Error(reason)
                    }
                } else if (cached != null) {
                    state = CloudAccessState.Active(cached, offline = true)
                } else {
                    state = CloudAccessState.Error("Walang koneksiyon sa SariPOS license server.")
                }
            }
        working = false
    }

    suspend fun uploadBackup(backupText: String): Result<Unit> = runCatching {
        val license = activeLicense()
        val token = requireAccessToken()
        working = true
        val body = JSONObject()
            .put("action", "upload")
            .put("storeId", license.storeId)
            .put("deviceKey", deviceKey)
            .put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            .put("kind", "manual")
            .put("backup", JSONObject(backupText))
        api.post("backups", token, body)
        loadBackups().getOrThrow()
    }.also { working = false }

    suspend fun loadBackups(): Result<List<CloudBackup>> = runCatching {
        val license = activeLicense()
        val response = api.post("backups", requireAccessToken(), JSONObject().put("action", "list").put("storeId", license.storeId))
        val array = response.optJSONArray("backups") ?: JSONArray()
        buildList {
            for (index in 0 until array.length()) {
                val item = array.getJSONObject(index)
                add(CloudBackup(
                    id = item.getString("id"),
                    kind = item.optString("backup_kind", "manual"),
                    appVersion = item.optString("app_version", ""),
                    sizeBytes = item.optInt("size_bytes"),
                    exportedAt = item.optString("exported_at").takeIf { it.isNotBlank() && it != "null" },
                    createdAt = item.optString("created_at")
                ))
            }
        }.also { backups = it }
    }

    suspend fun downloadBackup(backupId: String): Result<String> = runCatching {
        activeLicense()
        api.postText("backups", requireAccessToken(), JSONObject().put("action", "download").put("backupId", backupId))
    }

    suspend fun deleteBackup(backupId: String): Result<Unit> = runCatching {
        activeLicense()
        api.post("backups", requireAccessToken(), JSONObject().put("action", "delete").put("backupId", backupId))
        loadBackups().getOrThrow()
    }

    private fun activeLicense(): LicenseSnapshot =
        (state as? CloudAccessState.Active)?.license ?: error("Kailangan muna ng active SariPOS license.")

    private fun requireAccessToken(): String =
        SariPosCloud.client?.auth?.currentAccessTokenOrNull() ?: error("Mag-online at mag-login muna para sa cloud backup.")

    private fun friendlyReason(reason: String): String = when (reason) {
        "pending_approval" -> "Pending pa ang account. Hintayin ang approval ng SariPOS admin."
        "device_limit_reached" -> "Naabot na ang device limit ng package. Magpa-remove ng lumang device sa admin."
        "device_revoked" -> "Na-revoke ng admin ang device na ito."
        "license_expired" -> "Expired na ang SariPOS license."
        "license_suspended", "store_suspended" -> "Naka-suspend ang account. Makipag-ugnayan sa SariPOS admin."
        "license_cancelled" -> "Cancelled ang SariPOS license."
        else -> reason.ifBlank { "Hindi ma-activate ang account." }
    }

    private fun bindOrMatchStore(storeId: String): Boolean {
        val boundStoreId = installationStore.getString("bound_store_id", null)
        if (boundStoreId == null) {
            installationStore.edit().putString("bound_store_id", storeId).apply()
            return true
        }
        return boundStoreId == storeId
    }

    private fun loadDeviceKey(context: Context): String {
        installationStore.getString("device_key", null)?.let { return it }
        val installation = UUID.randomUUID().toString()
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID).orEmpty()
        val digest = MessageDigest.getInstance("SHA-256").digest("$installation:$androidId".toByteArray())
        val key = digest.joinToString("") { "%02x".format(it) }
        installationStore.edit().putString("device_key", key).apply()
        return key
    }
}

private class CloudApi {
    suspend fun post(function: String, accessToken: String, body: JSONObject): JSONObject =
        JSONObject(postText(function, accessToken, body))

    suspend fun postText(function: String, accessToken: String, body: JSONObject): String = withContext(Dispatchers.IO) {
        val connection = URL("${BuildConfig.SUPABASE_URL.trimEnd('/')}/functions/v1/$function").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            connection.doOutput = true
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body.toString().toByteArray(StandardCharsets.UTF_8)) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty().ifBlank { "Server error $code" }
                throw CloudHttpException(code, message)
            }
            text
        } finally {
            connection.disconnect()
        }
    }
}

private class CloudHttpException(val code: Int, val serverMessage: String) : Exception(serverMessage)

private object LicenseTokenVerifier {
    fun verify(token: String, expectedDeviceKey: String): LicenseSnapshot? = runCatching {
        val pieces = token.split('.')
        require(pieces.size == 2)
        val payloadBytes = Base64.decode(pieces[0], Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        val signatureBytes = Base64.decode(pieces[1], Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        val publicKeyBase64 = BuildConfig.SARIPOS_LICENSE_PUBLIC_KEY
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace("\n", "")
            .replace("\r", "")
        require(publicKeyBase64.isNotBlank())
        val publicKey = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(Base64.decode(publicKeyBase64, Base64.DEFAULT)))
        require(Signature.getInstance("SHA256withRSA").run {
            initVerify(publicKey)
            update(payloadBytes)
            verify(signatureBytes)
        })
        val payload = JSONObject(String(payloadBytes, StandardCharsets.UTF_8))
        require(payload.optInt("v") == 1)
        require(payload.getString("device_key") == expectedDeviceKey)
        val featuresObject = payload.optJSONObject("features") ?: JSONObject()
        val features = buildMap {
            featuresObject.keys().forEach { key -> put(key, featuresObject.optBoolean(key, false)) }
        }
        LicenseSnapshot(
            userId = payload.getString("sub"),
            storeId = payload.getString("store_id"),
            storeName = payload.optString("store_name", "SariPOS Store"),
            licenseId = payload.getString("license_id"),
            planCode = payload.getString("plan_code"),
            deviceKey = payload.getString("device_key"),
            maxDevices = payload.optInt("max_devices", 1),
            refreshAfter = payload.getLong("refresh_after"),
            validUntil = payload.getLong("valid_until"),
            licenseExpiresAt = payload.optLong("license_expires_at").takeIf { !payload.isNull("license_expires_at") },
            features = features
        ).also { require(it.isValid()) }
    }.getOrNull()
}

private class SecureLicenseStore(context: Context) {
    private val preferences = context.getSharedPreferences("saripos.secure.license", Context.MODE_PRIVATE)

    fun save(token: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encrypted = cipher.doFinal(token.toByteArray(StandardCharsets.UTF_8))
        preferences.edit()
            .putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString("token", Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .apply()
    }

    fun readVerified(deviceKey: String): LicenseSnapshot? = runCatching {
        val iv = Base64.decode(preferences.getString("iv", null), Base64.NO_WRAP)
        val encrypted = Base64.decode(preferences.getString("token", null), Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        val token = String(cipher.doFinal(encrypted), StandardCharsets.UTF_8)
        LicenseTokenVerifier.verify(token, deviceKey) ?: error("Invalid cached license")
    }.getOrNull()

    fun clear() = preferences.edit().clear().apply()

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build())
            generateKey()
        }
    }

    private companion object { const val KEY_ALIAS = "saripos_license_cache_v1" }
}
