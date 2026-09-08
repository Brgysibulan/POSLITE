plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val localProperties = java.util.Properties().apply {
    rootProject.file("local.properties").takeIf { it.isFile }?.inputStream()?.use(::load)
}

fun cloudSetting(name: String): String =
    providers.environmentVariable(name).orNull ?: localProperties.getProperty(name, "")

fun quotedBuildValue(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "ph.poslite.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "ph.poslite.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 7
        versionName = "0.9.0-native-dev"
        buildConfigField("String", "SUPABASE_URL", quotedBuildValue(cloudSetting("SUPABASE_URL")))
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", quotedBuildValue(cloudSetting("SUPABASE_PUBLISHABLE_KEY")))
        buildConfigField("String", "SARIPOS_LICENSE_PUBLIC_KEY", quotedBuildValue(cloudSetting("SARIPOS_LICENSE_PUBLIC_KEY")))
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
    implementation("androidx.browser:browser:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
    implementation("io.github.jan-tennert.supabase:auth-kt:3.8.0")
    implementation("io.ktor:ktor-client-okhttp:3.5.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
