package ph.poslite.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import ph.poslite.app.data.PosStore
import ph.poslite.app.data.StoreSettings

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        migrateLegacyDefaultStoreName()

        setContent {
            SariPOSTheme {
                PosApp()
            }
        }
    }

    private fun migrateLegacyDefaultStoreName() {
        runCatching {
            val store = PosStore(applicationContext)
            val current = store.getSettings()
            if (current.storeName.isBlank() || current.storeName == "POSlite Store") {
                store.saveSettings(StoreSettings("SariPOS Store", current.owner, current.address))
            }
            store.close()
        }
    }
}

@Composable
private fun SariPOSTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val colors = if (dark) {
        darkColorScheme(
            primary = Color(0xFF4ADE80),
            onPrimary = Color(0xFF052E16),
            secondary = Color(0xFFFACC15),
            tertiary = Color(0xFFF87171),
            background = Color(0xFF0F1712),
            surface = Color(0xFF17211A)
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF166534),
            onPrimary = Color.White,
            secondary = Color(0xFFFACC15),
            tertiary = Color(0xFFB91C1C),
            background = Color(0xFFF7FAF7),
            surface = Color.White
        )
    }

    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}
