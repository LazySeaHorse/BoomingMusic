package com.mardous.booming.ui.screen.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.mardous.booming.BuildConfig
import com.mardous.booming.R
import com.mardous.booming.extensions.navigation.findActivityNavController
import com.mardous.booming.ui.theme.BoomingMusicTheme

class ComposeSettingsHomeFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return ComposeView(requireContext()).apply {
            setViewCompositionStrategy(
                ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
            )
            setContent {
                BoomingMusicTheme {
                    SettingsHomeView(
                        onNavigate = { actionId ->
                            findNavController().navigate(actionId)
                        },
                        onNavigateToAbout = {
                            findActivityNavController(R.id.fragment_container).navigate(R.id.nav_about)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsHomeView(
    onNavigate: (Int) -> Unit,
    onNavigateToAbout: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    )
                ) {
                    Column {
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_palette_24dp,
                            title = stringResource(R.string.appearance_title),
                            summary = stringResource(R.string.appearance_summary),
                            onClick = { onNavigate(R.id.action_to_appearancePreferences) }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_play_circle_24dp,
                            title = stringResource(R.string.now_playing_title),
                            summary = stringResource(R.string.now_playing_summary),
                            onClick = { onNavigate(R.id.action_to_nowPlayingPreferences) }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_lyrics_outline_24dp,
                            title = stringResource(R.string.lyrics_preferences_title),
                            summary = stringResource(R.string.lyrics_preferences_summary),
                            onClick = { onNavigate(R.id.action_to_lyricsPreferences) }
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    )
                ) {
                    Column {
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_volume_up_24dp,
                            title = stringResource(R.string.playback_title),
                            summary = stringResource(R.string.playback_summary),
                            onClick = { onNavigate(R.id.action_to_playbackPreferences) }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_library_music_24dp,
                            title = stringResource(R.string.library_title),
                            summary = stringResource(R.string.library_summary),
                            onClick = { onNavigate(R.id.action_to_libraryPreferences) }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_cloud_24dp,
                            title = stringResource(R.string.network_title),
                            summary = stringResource(R.string.network_summary),
                            onClick = { onNavigate(R.id.action_to_networkPreferences) }
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer
                    )
                ) {
                    Column {
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_settings_applications_24dp,
                            title = stringResource(R.string.advanced_title),
                            summary = stringResource(R.string.advanced_summary),
                            onClick = { onNavigate(R.id.action_to_advancedPreferences) }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsHomeItem(
                            iconRes = R.drawable.ic_info_24dp,
                            title = stringResource(R.string.about_title),
                            summary = stringResource(R.string.about_summary, BuildConfig.VERSION_NAME),
                            onClick = onNavigateToAbout
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsHomeItem(
    iconRes: Int,
    title: String,
    summary: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            painter = painterResource(id = iconRes),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (summary != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(modifier = Modifier.width(16.dp))
        Icon(
            painter = painterResource(id = R.drawable.ic_next_24dp),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.size(16.dp)
        )
    }
}
