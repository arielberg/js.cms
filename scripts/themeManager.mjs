/**
 * Theme Manager - Manage site theme
 */

import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';

// Theme definitions with colors
const themeDefinitions = {
    default: {
        label: 'Default',
        description: 'Standard theme with clean design',
        colors: {
            primary: '#667eea',
            secondary: '#764ba2',
            background: '#ffffff',
            text: '#2d3748',
            accent: '#48bb78'
        }
    },
    minimal: {
        label: 'Minimal',
        description: 'Minimalist theme with focus on content',
        colors: {
            primary: '#000000',
            secondary: '#666666',
            background: '#ffffff',
            text: '#1a1a1a',
            accent: '#333333'
        }
    },
    modern: {
        label: 'Modern',
        description: 'Modern theme with contemporary styling',
        colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            background: '#f8fafc',
            text: '#1e293b',
            accent: '#10b981'
        }
    },
    classic: {
        label: 'Classic',
        description: 'Classic theme with traditional design',
        colors: {
            primary: '#8b4513',
            secondary: '#d2691e',
            background: '#faf5f0',
            text: '#3d2817',
            accent: '#cd853f'
        }
    }
};

/**
 * Show theme management interface
 */
export async function themeManager(parentElement) {
    // Load latest appSettings before rendering
    try {
        const gitApi = utils.getGlobalVariable('gitApi');
        if (gitApi && gitApi.getFile) {
            try {
                const latestSettings = await gitApi.getFile('config/appSettings.json');
                const parsedSettings = JSON.parse(latestSettings);
                utils.setGlobalVariable('appSettings', parsedSettings);
            } catch (error) {
                console.warn('Could not load latest appSettings from GitHub, using cached:', error);
            }
        }
    } catch (error) {
        console.warn('Error loading appSettings for theme manager:', error);
    }
    
    const appSettings = utils.getGlobalVariable('appSettings') || {};
    const currentTheme = appSettings.Theme || 'default';
    const themeColors = appSettings.ThemeColors || (themeDefinitions[currentTheme] ? themeDefinitions[currentTheme].colors : themeDefinitions.default.colors);
    
    const themes = Object.keys(themeDefinitions).map(key => ({
        value: key,
        ...themeDefinitions[key]
    }));
    
    parentElement.innerHTML = `
        <div id="themeManager" class="theme-manager">
            <div class="manager-header">
                <h1>Theme Settings</h1>
                <p class="text-muted">Select the theme for your entire site. The theme will be applied to all pages.</p>
            </div>
            
            <div class="theme-selection">
                <div class="row">
                    ${themes.map(theme => `
                        <div class="col-md-6 mb-4">
                            <div class="theme-card ${currentTheme === theme.value ? 'active' : ''}" 
                                 data-theme="${theme.value}"
                                 onclick="window.selectTheme('${theme.value}', this)">
                                <div class="theme-preview" style="background: ${theme.colors.background};">
                                    <div class="theme-preview-header" style="background: ${theme.colors.primary};">
                                        <div class="preview-nav-item" style="background: ${theme.colors.secondary};"></div>
                                        <div class="preview-nav-item" style="background: ${theme.colors.secondary};"></div>
                                    </div>
                                    <div class="theme-preview-content">
                                        <div class="preview-title" style="background: ${theme.colors.text};"></div>
                                        <div class="preview-text" style="background: ${theme.colors.text}; opacity: 0.6;"></div>
                                        <div class="preview-text" style="background: ${theme.colors.text}; opacity: 0.4;"></div>
                                        <div class="preview-button" style="background: ${theme.colors.accent};"></div>
                                    </div>
                                </div>
                                <div class="theme-info">
                                    <h3>${theme.label}</h3>
                                    <p class="text-muted">${theme.description}</p>
                                    <div class="theme-color-palette">
                                        ${Object.entries(theme.colors).map(([name, color]) => `
                                            <span class="color-swatch" style="background: ${color};" title="${name}: ${color}"></span>
                                        `).join('')}
                                    </div>
                                    ${currentTheme === theme.value ? '<span class="badge badge-success">Active</span>' : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="theme-customization mt-5" id="themeCustomization" style="display: none;">
                <div class="card">
                    <div class="card-header">
                        <h3>Customize Colors</h3>
                        <p class="text-muted mb-0">Adjust the color scheme for the selected theme</p>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label>Primary Color</label>
                                <div class="input-group">
                                    <input type="color" class="form-control" id="colorPrimary" value="${themeColors.primary || themeDefinitions[currentTheme].colors.primary}">
                                    <input type="text" class="form-control" id="colorPrimaryText" value="${themeColors.primary || themeDefinitions[currentTheme].colors.primary}" 
                                           onchange="window.updateColorPreview('primary', this.value)">
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label>Secondary Color</label>
                                <div class="input-group">
                                    <input type="color" class="form-control" id="colorSecondary" value="${themeColors.secondary || themeDefinitions[currentTheme].colors.secondary}">
                                    <input type="text" class="form-control" id="colorSecondaryText" value="${themeColors.secondary || themeDefinitions[currentTheme].colors.secondary}"
                                           onchange="window.updateColorPreview('secondary', this.value)">
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label>Background Color</label>
                                <div class="input-group">
                                    <input type="color" class="form-control" id="colorBackground" value="${themeColors.background || themeDefinitions[currentTheme].colors.background}">
                                    <input type="text" class="form-control" id="colorBackgroundText" value="${themeColors.background || themeDefinitions[currentTheme].colors.background}"
                                           onchange="window.updateColorPreview('background', this.value)">
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label>Text Color</label>
                                <div class="input-group">
                                    <input type="color" class="form-control" id="colorText" value="${themeColors.text || themeDefinitions[currentTheme].colors.text}">
                                    <input type="text" class="form-control" id="colorTextText" value="${themeColors.text || themeDefinitions[currentTheme].colors.text}"
                                           onchange="window.updateColorPreview('text', this.value)">
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label>Accent Color</label>
                                <div class="input-group">
                                    <input type="color" class="form-control" id="colorAccent" value="${themeColors.accent || themeDefinitions[currentTheme].colors.accent}">
                                    <input type="text" class="form-control" id="colorAccentText" value="${themeColors.accent || themeDefinitions[currentTheme].colors.accent}"
                                           onchange="window.updateColorPreview('accent', this.value)">
                                </div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="button" class="btn btn-secondary" onclick="window.resetThemeColors()">Reset to Theme Defaults</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-actions mt-4">
                <button type="button" class="btn btn-secondary mr-2" id="customizeThemeBtn" onclick="window.toggleCustomization()" style="display: none;">
                    Customize Colors
                </button>
                <button type="button" class="btn btn-primary btn-lg" id="saveThemeBtn" onclick="window.saveTheme()" style="display: none;">
                    Save Theme
                </button>
            </div>
        </div>
    `;
    
    // Sync color inputs
    setupColorInputs();
    
    window.selectedTheme = currentTheme;
    window.currentThemeColors = { ...themeColors };
}

/**
 * Setup color input synchronization
 */
function setupColorInputs() {
    const colorInputs = ['Primary', 'Secondary', 'Background', 'Text', 'Accent'];
    colorInputs.forEach(colorName => {
        const colorInput = document.getElementById(`color${colorName}`);
        const textInput = document.getElementById(`color${colorName}Text`);
        
        if (colorInput && textInput) {
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                updateColorPreview(colorName.toLowerCase(), e.target.value);
            });
            
            textInput.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                    updateColorPreview(colorName.toLowerCase(), e.target.value);
                }
            });
        }
    });
}

/**
 * Update color preview
 */
export function updateColorPreview(colorName, colorValue) {
    if (!window.currentThemeColors) {
        window.currentThemeColors = {};
    }
    window.currentThemeColors[colorName] = colorValue;
    
    // Update preview if theme card is visible
    const activeCard = document.querySelector('.theme-card.active');
    if (activeCard) {
        const preview = activeCard.querySelector('.theme-preview');
        if (preview) {
            if (colorName === 'background') {
                preview.style.background = colorValue;
            } else if (colorName === 'primary') {
                const header = preview.querySelector('.theme-preview-header');
                if (header) header.style.background = colorValue;
            } else if (colorName === 'secondary') {
                const navItems = preview.querySelectorAll('.preview-nav-item');
                navItems.forEach(item => item.style.background = colorValue);
            } else if (colorName === 'text') {
                const title = preview.querySelector('.preview-title');
                const texts = preview.querySelectorAll('.preview-text');
                if (title) title.style.background = colorValue;
                texts.forEach(text => text.style.background = colorValue);
            } else if (colorName === 'accent') {
                const button = preview.querySelector('.preview-button');
                if (button) button.style.background = colorValue;
            }
        }
    }
}

/**
 * Toggle color customization panel
 */
export function toggleCustomization() {
    const panel = document.getElementById('themeCustomization');
    const btn = document.getElementById('customizeThemeBtn');
    if (panel && btn) {
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            btn.textContent = 'Hide Customization';
        } else {
            panel.style.display = 'none';
            btn.textContent = 'Customize Colors';
        }
    }
}

/**
 * Reset theme colors to defaults
 */
export function resetThemeColors() {
    const selectedTheme = window.selectedTheme || 'default';
    const defaultColors = themeDefinitions[selectedTheme].colors;
    
    Object.keys(defaultColors).forEach(colorName => {
        const colorInput = document.getElementById(`color${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`);
        const textInput = document.getElementById(`color${colorName.charAt(0).toUpperCase() + colorName.slice(1)}Text`);
        if (colorInput) colorInput.value = defaultColors[colorName];
        if (textInput) textInput.value = defaultColors[colorName];
        updateColorPreview(colorName, defaultColors[colorName]);
    });
    
    window.currentThemeColors = { ...defaultColors };
}

/**
 * Select theme
 */
export function selectTheme(themeValue, element) {
    window.selectedTheme = themeValue;
    
    // Update UI
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    } else {
        // Fallback: find by data-theme attribute
        const selectedCard = document.querySelector(`.theme-card[data-theme="${themeValue}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }
    
    // Show save button
    const saveBtn = document.getElementById('saveThemeBtn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
    }
}

/**
 * Save theme
 */
async function saveTheme() {
    const selectedTheme = window.selectedTheme;
    if (!selectedTheme) {
        utils.errorHandler({ message: 'Please select a theme' });
        return;
    }
    
    const appSettings = utils.getGlobalVariable('appSettings') || {};
    appSettings.Theme = selectedTheme;
    
    // Save custom colors if they exist and differ from defaults
    if (window.currentThemeColors) {
        const defaultColors = themeDefinitions[selectedTheme].colors;
        const hasCustomColors = Object.keys(window.currentThemeColors).some(key => 
            window.currentThemeColors[key] !== defaultColors[key]
        );
        
        if (hasCustomColors) {
            appSettings.ThemeColors = window.currentThemeColors;
        } else {
            delete appSettings.ThemeColors;
        }
    }
    
    const files = [{
        content: JSON.stringify(appSettings, null, 4),
        filePath: 'config/appSettings.json',
        encoding: 'utf-8'
    }];
    
    const submitButton = document.getElementById('saveThemeBtn');
    const originalButtonText = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    }
    
    try {
        await commitFiles('Update site theme', files);
        
        // Update global variable
        utils.setGlobalVariable('appSettings', appSettings);
        
        // Clear cache
        localStorage.removeItem('appSettings');
        
        utils.successMessage('Theme saved successfully. The new theme will be applied to all pages.');
        
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            submitButton.style.display = 'none';
        }
        
        // Reload to show updated theme
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error saving theme:', error);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        utils.errorHandler(error);
    }
}

// Expose functions to window
window.selectTheme = selectTheme;
window.saveTheme = saveTheme;
window.updateColorPreview = updateColorPreview;
window.toggleCustomization = toggleCustomization;
window.resetThemeColors = resetThemeColors;

