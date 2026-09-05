package ph.poslite.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            POSliteTheme {
                PosApp()
            }
        }
    }
}

@Composable
private fun POSliteTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF166534),
            onPrimary = Color.White,
            secondary = Color(0xFFFACC15),
            tertiary = Color(0xFFB91C1C),
            background = Color(0xFFF7FAF7),
            surface = Color.White
        ),
        content = content
    )
}
