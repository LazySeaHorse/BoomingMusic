package com.mardous.booming.ui.screen.settings

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.edit
import androidx.fragment.app.Fragment
import androidx.preference.PreferenceManager
import com.google.android.material.color.DynamicColors
import com.mardous.booming.R
import com.mardous.booming.extensions.hasS
import com.mardous.booming.ui.component.preferences.dialog.CategoriesPreferenceDialog
import com.mardous.booming.ui.component.preferences.dialog.ExtraInfoPreferenceDialog
import com.mardous.booming.ui.theme.BoomingMusicTheme
import com.mardous.booming.ui.theme.PaletteStyle
import com.mardous.booming.util.Preferences
import com.mardous.booming.util.GeneralTheme

class ComposeAppearancePreferencesFragment : Fragment() {

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
                    AppearanceSettingsView(
                        onOpenCategories = {
                            CategoriesPreferenceDialog().show(childFragmentManager, "CATEGORIES_DIALOG")
                        },
                        onOpenWidgetThirdLine = {
                            ExtraInfoPreferenceDialog.appWidgets(requireContext()).show(childFragmentManager, "WIDGET_INFO_DIALOG")
                        },
                        onRecreateActivity = {
                            requireActivity().recreate()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun AppearanceSettingsView(
    onOpenCategories: () -> Unit,
    onOpenWidgetThirdLine: () -> Unit,
    onRecreateActivity: () -> Unit
) {
    val context = LocalContext.current
    val sharedPreferences = remember { PreferenceManager.getDefaultSharedPreferences(context) }

    var generalTheme by remember { mutableStateOf(Preferences.generalTheme) }
    var blackTheme by remember { mutableStateOf(Preferences.blackTheme) }
    var colorSource by remember { mutableStateOf(Preferences.themeColorSource) }
    var basicColorSeed by remember { mutableStateOf(Preferences.themeBasicColorSeed) }
    var paletteStyle by remember { mutableStateOf(Preferences.themePaletteStyle) }

    var customFontEnabled by remember { mutableStateOf(sharedPreferences.getBoolean("use_custom_font", true)) }
    var appBarMode by remember { mutableStateOf(sharedPreferences.getString("appbar_mode", "compact") ?: "compact") }
    
    var rememberLastPage by remember { mutableStateOf(sharedPreferences.getBoolean("remember_last_page", true)) }
    var tabTitlesMode by remember { mutableStateOf(sharedPreferences.getString("tab_titles_mode", "selected") ?: "selected") }
    var holdTabToSearch by remember { mutableStateOf(sharedPreferences.getBoolean("hold_tab_to_search", true)) }
    
    var largerHeaderImage by remember { mutableStateOf(sharedPreferences.getBoolean("larger_header_image", false)) }
    
    var widgetSmallLayoutStyle by remember { mutableStateOf(sharedPreferences.getString("widget_small_layout_style", "simplified") ?: "simplified") }
    var widgetDynamicColors by remember { mutableStateOf(sharedPreferences.getBoolean("widget_dynamic_colors", false)) }
    var widgetImageCornerRadius by remember { mutableStateOf(sharedPreferences.getInt("widget_image_corner_radius", 8)) }

    val basicColors = listOf(
        0xFF6750A4 to "Purple (Default)",
        0xFF006C4C to "Green",
        0xFFBA1A1A to "Red",
        0xFF0061A4 to "Blue",
        0xFF8B5000 to "Orange",
        0xFFB52078 to "Pink",
        0xFF607D8B to "Slate",
        0xFF006A6A to "Teal"
    )

    val paletteStyles = listOf(
        "TonalSpot" to "Tonal Spot",
        "Neutral" to "Neutral",
        "Vibrant" to "Vibrant",
        "Expressive" to "Expressive",
        "Rainbow" to "Rainbow",
        "FruitSalad" to "Fruit Salad",
        "Monochrome" to "Monochrome",
        "Fidelity" to "Fidelity",
        "Content" to "Content"
    )

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Card: Theme Mode
            item {
                Text(
                    text = "Theme mode",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ThemeModeOption(
                                label = "System",
                                selected = generalTheme == GeneralTheme.AUTO,
                                onClick = {
                                    generalTheme = GeneralTheme.AUTO
                                    Preferences.generalTheme = GeneralTheme.AUTO
                                    AppCompatDelegate.setDefaultNightMode(Preferences.getDayNightMode(GeneralTheme.AUTO))
                                    onRecreateActivity()
                                }
                            )
                            ThemeModeOption(
                                label = "Light",
                                selected = generalTheme == GeneralTheme.LIGHT,
                                onClick = {
                                    generalTheme = GeneralTheme.LIGHT
                                    Preferences.generalTheme = GeneralTheme.LIGHT
                                    AppCompatDelegate.setDefaultNightMode(Preferences.getDayNightMode(GeneralTheme.LIGHT))
                                    onRecreateActivity()
                                }
                            )
                            ThemeModeOption(
                                label = "Dark",
                                selected = generalTheme == GeneralTheme.DARK || generalTheme == GeneralTheme.BLACK,
                                onClick = {
                                    generalTheme = GeneralTheme.DARK
                                    Preferences.generalTheme = GeneralTheme.DARK
                                    AppCompatDelegate.setDefaultNightMode(Preferences.getDayNightMode(GeneralTheme.DARK))
                                    onRecreateActivity()
                                }
                            )
                        }
                    }
                }
            }

            // Card: Colors (Wallpaper & Basic Colors)
            item {
                Text(
                    text = "Color source",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        if (hasS()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                ColorSourceOption(
                                    label = "Wallpaper",
                                    selected = colorSource == "wallpaper",
                                    onClick = {
                                        colorSource = "wallpaper"
                                        Preferences.themeColorSource = "wallpaper"
                                        Preferences.isMaterialYouTheme = true
                                        DynamicColors.applyToActivityIfAvailable(context as android.app.Activity)
                                        onRecreateActivity()
                                    }
                                )
                                ColorSourceOption(
                                    label = "Preset Colors",
                                    selected = colorSource == "basic_color",
                                    onClick = {
                                        colorSource = "basic_color"
                                        Preferences.themeColorSource = "basic_color"
                                        Preferences.isMaterialYouTheme = false
                                        onRecreateActivity()
                                    }
                                )
                            }
                        }

                        if (colorSource == "basic_color" || !hasS()) {
                            Text(
                                text = "Choose preset color",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                            
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(4),
                                modifier = Modifier.fillMaxWidth().height(110.dp).padding(4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                userScrollEnabled = false
                            ) {
                                items(basicColors) { (colorVal, name) ->
                                    val color = Color(colorVal)
                                    Box(
                                        modifier = Modifier
                                            .size(44.dp)
                                            .clip(CircleShape)
                                            .background(color)
                                            .clickable {
                                                basicColorSeed = colorVal.toInt()
                                                Preferences.themeBasicColorSeed = colorVal.toInt()
                                                onRecreateActivity()
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (basicColorSeed == colorVal.toInt()) {
                                            Icon(
                                                painter = painterResource(id = R.drawable.ic_check_24dp),
                                                contentDescription = name,
                                                tint = Color.White,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                            )

                            SettingsDropdownRow(
                                title = "Palette Style",
                                subtitle = "Choose palette color distribution",
                                selectedValueLabel = paletteStyles.firstOrNull { it.first == paletteStyle }?.second ?: paletteStyle,
                                options = paletteStyles,
                                onValueSelected = { newStyle ->
                                    paletteStyle = newStyle
                                    Preferences.themePaletteStyle = newStyle
                                    onRecreateActivity()
                                }
                            )
                        }
                    }
                }
            }

            // Card: Theme Overrides (AMOLED & Fonts)
            item {
                Text(
                    text = "Styling options",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column {
                        SettingsSwitchRow(
                            title = stringResource(R.string.pure_black_theme_title),
                            subtitle = "Use pure black instead of dark gray",
                            checked = blackTheme,
                            onCheckedChange = { isChecked ->
                                blackTheme = isChecked
                                Preferences.blackTheme = isChecked
                                onRecreateActivity()
                            }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsSwitchRow(
                            title = stringResource(R.string.use_custom_font_title),
                            subtitle = "Use modern clean typography font",
                            checked = customFontEnabled,
                            onCheckedChange = { isChecked ->
                                customFontEnabled = isChecked
                                sharedPreferences.edit { putBoolean("use_custom_font", isChecked) }
                                onRecreateActivity()
                            }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsDropdownRow(
                            title = stringResource(R.string.appbar_mode_title),
                            selectedValueLabel = if (appBarMode == "compact") "Compact" else "Expanded",
                            options = listOf("compact" to "Compact", "expanded" to "Expanded"),
                            onValueSelected = { newMode ->
                                appBarMode = newMode
                                sharedPreferences.edit { putString("appbar_mode", newMode) }
                                onRecreateActivity()
                            }
                        )
                    }
                }
            }

            // Card: Library Categories
            item {
                Text(
                    text = "Library Page",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column {
                        SettingsActionRow(
                            title = stringResource(R.string.library_categories_title),
                            subtitle = stringResource(R.string.library_categories_summary),
                            onClick = onOpenCategories
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsSwitchRow(
                            title = stringResource(R.string.remember_last_page_title),
                            subtitle = stringResource(R.string.remember_last_page_summary),
                            checked = rememberLastPage,
                            onCheckedChange = { isChecked ->
                                rememberLastPage = isChecked
                                sharedPreferences.edit { putBoolean("remember_last_page", isChecked) }
                            }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsDropdownRow(
                            title = stringResource(R.string.tab_mode_title),
                            selectedValueLabel = when (tabTitlesMode) {
                                "selected" -> "Selected"
                                "labeled" -> "Labeled"
                                "unlabeled" -> "Unlabeled"
                                else -> tabTitlesMode
                            },
                            options = listOf(
                                "selected" to "Selected",
                                "labeled" to "Labeled",
                                "unlabeled" to "Unlabeled"
                            ),
                            onValueSelected = { newMode ->
                                tabTitlesMode = newMode
                                sharedPreferences.edit { putString("tab_titles_mode", newMode) }
                            }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsSwitchRow(
                            title = stringResource(R.string.hold_tab_to_search_title),
                            subtitle = stringResource(R.string.hold_tab_to_search_summary),
                            checked = holdTabToSearch,
                            onCheckedChange = { isChecked ->
                                holdTabToSearch = isChecked
                                sharedPreferences.edit { putBoolean("hold_tab_to_search", isChecked) }
                            }
                        )
                    }
                }
            }

            // Card: Display Options
            item {
                Text(
                    text = "Display Options",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column {
                        SettingsSwitchRow(
                            title = stringResource(R.string.larger_header_image_title),
                            subtitle = stringResource(R.string.larger_header_image_summary),
                            checked = largerHeaderImage,
                            onCheckedChange = { isChecked ->
                                largerHeaderImage = isChecked
                                sharedPreferences.edit { putBoolean("larger_header_image", isChecked) }
                            }
                        )
                    }
                }
            }

            // Card: Widgets configuration
            item {
                Text(
                    text = "Widgets & Control",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
                ) {
                    Column {
                        SettingsDropdownRow(
                            title = stringResource(R.string.widget_small_layout_style_title),
                            selectedValueLabel = if (widgetSmallLayoutStyle == "simplified") "Simplified" else "Classic",
                            options = listOf("simplified" to "Simplified", "classic" to "Classic"),
                            onValueSelected = { newStyle ->
                                widgetSmallLayoutStyle = newStyle
                                sharedPreferences.edit { putString("widget_small_layout_style", newStyle) }
                            }
                        )
                        if (hasS()) {
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                            )
                            SettingsSwitchRow(
                                title = stringResource(R.string.widget_dynamic_colors_title),
                                subtitle = stringResource(R.string.widget_dynamic_colors_summary),
                                checked = widgetDynamicColors,
                                onCheckedChange = { isChecked ->
                                    widgetDynamicColors = isChecked
                                    sharedPreferences.edit { putBoolean("widget_dynamic_colors", isChecked) }
                                }
                            )
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                            )
                            SettingsSliderRow(
                                title = stringResource(R.string.widget_image_corner_radius_title),
                                value = widgetImageCornerRadius.toFloat(),
                                valueRange = 8f..32f,
                                onValueChangeFinished = { newValue ->
                                    widgetImageCornerRadius = newValue.toInt()
                                    sharedPreferences.edit { putInt("widget_image_corner_radius", newValue.toInt()) }
                                }
                            )
                        }
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                        )
                        SettingsActionRow(
                            title = stringResource(R.string.widget_third_line_title),
                            subtitle = stringResource(R.string.widget_third_line_summary),
                            onClick = onOpenWidgetThirdLine
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RowScope.ThemeModeOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick)
            .border(
                width = 1.5.dp,
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                shape = RoundedCornerShape(12.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun RowScope.ColorSourceOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick)
            .border(
                width = 1.5.dp,
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                shape = RoundedCornerShape(12.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun SettingsDropdownRow(
    title: String,
    subtitle: String? = null,
    selectedValueLabel: String,
    options: List<Pair<String, String>>,
    onValueSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Box {
            Text(
                text = selectedValueLabel,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { (label, value) ->
                    DropdownMenuItem(
                        text = { Text(label) },
                        onClick = {
                            onValueSelected(value)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsSwitchRow(
    title: String,
    subtitle: String? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

@Composable
fun SettingsActionRow(
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Icon(
            painter = painterResource(id = R.drawable.ic_next_24dp),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.size(16.dp)
        )
    }
}

@Composable
fun SettingsSliderRow(
    title: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float>,
    steps: Int = 0,
    onValueChangeFinished: (Float) -> Unit
) {
    var sliderValue by remember(value) { mutableStateOf(value) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Text(
                text = sliderValue.toInt().toString() + " dp",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Slider(
            value = sliderValue,
            onValueChange = { sliderValue = it },
            valueRange = valueRange,
            steps = steps,
            onValueChangeFinished = {
                onValueChangeFinished(sliderValue)
            }
        )
    }
}
