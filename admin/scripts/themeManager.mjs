/**
 * Theme Manager - Manage site theme
 */

import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';

/**
 * Show theme management interface
 */
export function themeManager(parentElement) {
    const appSettings = utils.getGlobalVariable('appSettings') || {};
    const currentTheme = appSettings.Theme || 'default';
    
    const themes = [
        { value: 'default', label: 'Default', description: 'Standard theme with clean design' },
        { value: 'minimal', label: 'Minimal', description: 'Minimalist theme with focus on content' },
        { value: 'modern', label: 'Modern', description: 'Modern theme with contemporary styling' },
        { value: 'classic', label: 'Classic', description: 'Classic theme with traditional design' }
    ];
    
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
                                <div class="theme-preview">
                                    <div class="theme-preview-header"></div>
                                    <div class="theme-preview-content"></div>
                                </div>
                                <div class="theme-info">
                                    <h3>${theme.label}</h3>
                                    <p class="text-muted">${theme.description}</p>
                                    ${currentTheme === theme.value ? '<span class="badge badge-success">Active</span>' : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-actions mt-4">
                <button type="button" class="btn btn-primary btn-lg" id="saveThemeBtn" onclick="window.saveTheme()" style="display: none;">
                    Save Theme
                </button>
            </div>
        </div>
    `;
    
    window.selectedTheme = currentTheme;
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

