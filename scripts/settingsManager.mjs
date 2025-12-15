/**
 * Global Settings Manager - Manage site-wide settings
 */

import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';

/**
 * Show global settings interface
 */
export function settingsManager(parentElement) {
    // Render inside a try/catch so if anything goes wrong we still show an error message
    try {
        const appSettings = utils.getGlobalVariable('appSettings') || {};
        
        // Default values
        const cssMode = appSettings.CSS_Mode || 'embed'; // 'embed' or 'link'
        const jsMode = appSettings.JS_Mode || 'embed'; // 'embed' or 'link'
        const basePathMode = appSettings.BasePath_Mode || 'auto'; // 'auto', 'set', or 'relative'
        const basePathValue = appSettings.BasePath_Value || '';
        
        parentElement.innerHTML = `
        <div id="settingsManager" class="settings-manager">
            <div class="manager-header">
                <h1>Global Settings</h1>
                <p class="text-muted">Configure site-wide settings for asset loading and paths</p>
            </div>
            
            <form id="settingsForm" class="settings-form">
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Asset Loading</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="cssMode">
                                <strong>CSS Loading Mode</strong>
                                <small class="text-muted d-block">How CSS files should be loaded in generated pages</small>
                            </label>
                            <select class="form-control" id="cssMode" name="cssMode">
                                <option value="embed" ${cssMode === 'embed' ? 'selected' : ''}>Embed (Inline CSS in HTML)</option>
                                <option value="link" ${cssMode === 'link' ? 'selected' : ''}>Link (External CSS files)</option>
                            </select>
                            <small class="form-text text-muted">
                                <strong>Embed:</strong> CSS is embedded directly in HTML (better for GitHub Pages, no path issues)<br>
                                <strong>Link:</strong> CSS is loaded from external files (better for caching, requires correct paths)
                            </small>
                        </div>
                        
                        <div class="form-group">
                            <label for="jsMode">
                                <strong>JavaScript Loading Mode</strong>
                                <small class="text-muted d-block">How JavaScript files should be loaded in generated pages</small>
                            </label>
                            <select class="form-control" id="jsMode" name="jsMode">
                                <option value="embed" ${jsMode === 'embed' ? 'selected' : ''}>Embed (Inline JS in HTML)</option>
                                <option value="link" ${jsMode === 'link' ? 'selected' : ''}>Link (External JS files)</option>
                            </select>
                            <small class="form-text text-muted">
                                <strong>Embed:</strong> JS is embedded directly in HTML (better for GitHub Pages, no path issues)<br>
                                <strong>Link:</strong> JS is loaded from external files (better for caching, requires correct paths)
                            </small>
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Base Path Configuration</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="basePathMode">
                                <strong>Base Path Mode</strong>
                                <small class="text-muted d-block">How to handle base paths for assets and links</small>
                            </label>
                            <select class="form-control" id="basePathMode" name="basePathMode">
                                <option value="auto" ${basePathMode === 'auto' ? 'selected' : ''}>Auto-detect (Recommended)</option>
                                <option value="set" ${basePathMode === 'set' ? 'selected' : ''}>Set Manually</option>
                                <option value="relative" ${basePathMode === 'relative' ? 'selected' : ''}>Relative Paths</option>
                            </select>
                            <small class="form-text text-muted">
                                <strong>Auto:</strong> Automatically detect GitHub Pages base path (e.g., /test2)<br>
                                <strong>Set:</strong> Manually specify a base path<br>
                                <strong>Relative:</strong> Use relative paths (works for localhost, may break on GitHub Pages)
                            </small>
                        </div>
                        
                        <div class="form-group" id="basePathValueGroup" style="display: ${basePathMode === 'set' ? 'block' : 'none'};">
                            <label for="basePathValue">
                                <strong>Base Path Value</strong>
                                <small class="text-muted d-block">Enter the base path (e.g., /test2 for GitHub Pages)</small>
                            </label>
                            <input type="text" class="form-control" id="basePathValue" name="basePathValue" 
                                   value="${basePathValue}" placeholder="/test2">
                            <small class="form-text text-muted">
                                Include leading slash, no trailing slash (e.g., /test2, /my-site)
                            </small>
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Branding</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="logoFile">
                                <strong>Logo</strong>
                                <small class="text-muted d-block">Upload a logo to replace assets/images/logo.png</small>
                            </label>
                            <input type="file" class="form-control-file" id="logoFile" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label for="faviconFile">
                                <strong>Favicon</strong>
                                <small class="text-muted d-block">Upload a favicon (.ico, .png) to replace assets/images/favicon.ico</small>
                            </label>
                            <input type="file" class="form-control-file" id="faviconFile" accept=".ico,.png,image/x-icon,image/png">
                        </div>
                        <small class="text-muted">Files are saved to assets/images/logo.png and assets/images/favicon.ico</small>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-lg">
                        💾 Save Settings
                    </button>
                    <button type="button" class="btn btn-secondary btn-lg" onclick="window.resetSettings()">
                        🔄 Reset to Defaults
                    </button>
                </div>
            </form>
        </div>
        `;
        
        // Show/hide base path value input based on mode
        document.getElementById('basePathMode').addEventListener('change', (e) => {
            const valueGroup = document.getElementById('basePathValueGroup');
            valueGroup.style.display = e.target.value === 'set' ? 'block' : 'none';
        });
        
        // Handle form submission
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSettings();
        });
        
        // Make reset function available
        window.resetSettings = resetSettings;
    } catch (error) {
        console.error('Settings page render failed:', error);
        parentElement.innerHTML = `
            <div class="alert alert-danger">
                <h3>Failed to load Global Settings</h3>
                <p>${error?.message || 'Unknown error'}</p>
                <p class="text-muted">Please check console for details.</p>
            </div>
        `;
    }
}

/**
 * Save settings to appSettings.json
 */
async function saveSettings() {
    const form = document.getElementById('settingsForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = '💾 Saving...';
        
        const cssMode = document.getElementById('cssMode').value;
        const jsMode = document.getElementById('jsMode').value;
        const basePathMode = document.getElementById('basePathMode').value;
        const basePathValue = document.getElementById('basePathValue').value;
    const logoInput = document.getElementById('logoFile');
    const faviconInput = document.getElementById('faviconFile');
        
        // Load current appSettings
        const gitApi = utils.getGlobalVariable('gitApi');
        if (!gitApi) {
            throw new Error('GitHub API not initialized. Please log in first.');
        }
        
        let appSettings = {};
        try {
            const currentSettings = await gitApi.getFile('config/appSettings.json');
            appSettings = JSON.parse(currentSettings);
        } catch (error) {
            console.warn('Could not load existing appSettings, using defaults');
        }
        
        // Update settings
        appSettings.CSS_Mode = cssMode;
        appSettings.JS_Mode = jsMode;
        appSettings.BasePath_Mode = basePathMode;
        if (basePathMode === 'set') {
            appSettings.BasePath_Value = basePathValue;
        } else {
            delete appSettings.BasePath_Value;
        }
        
        const files = [];
        
        // Save to repository
        files.push({
            content: JSON.stringify(appSettings, null, 4),
            filePath: 'config/appSettings.json',
            encoding: 'utf-8'
        });
        
        // Upload logo if provided
        if (logoInput && logoInput.files && logoInput.files[0]) {
            const logoBase64 = await fileToBase64(logoInput.files[0]);
            files.push({
                content: logoBase64,
                filePath: 'assets/images/logo.png',
                encoding: 'base64'
            });
        }
        
        // Upload favicon if provided
        if (faviconInput && faviconInput.files && faviconInput.files[0]) {
            const faviconBase64 = await fileToBase64(faviconInput.files[0]);
            files.push({
                content: faviconBase64,
                filePath: 'assets/images/favicon.ico',
                encoding: 'base64'
            });
        }
        
        await commitFiles('Update global settings', files);
        
        // Update global variable
        utils.setGlobalVariable('appSettings', appSettings);
        
        utils.successMessage('Settings saved successfully! You may need to rebuild pages for changes to take effect.');
        
        // Reload settings display
        settingsManager(document.getElementById('content'));
        
    } catch (error) {
        console.error('Error saving settings:', error);
        utils.errorHandler(error);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

/**
 * Convert a File to base64 (without data URI prefix)
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || '';
            const base64 = typeof result === 'string' ? result.split(',').pop() : '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
        return;
    }
    
    try {
        const gitApi = utils.getGlobalVariable('gitApi');
        if (!gitApi) {
            throw new Error('GitHub API not initialized. Please log in first.');
        }
        
        // Load current appSettings
        let appSettings = {};
        try {
            const currentSettings = await gitApi.getFile('config/appSettings.json');
            appSettings = JSON.parse(currentSettings);
        } catch (error) {
            console.warn('Could not load existing appSettings');
        }
        
        // Remove settings (use defaults)
        delete appSettings.CSS_Mode;
        delete appSettings.JS_Mode;
        delete appSettings.BasePath_Mode;
        delete appSettings.BasePath_Value;
        
        // Save to repository
        const files = [{
            content: JSON.stringify(appSettings, null, 4),
            filePath: 'config/appSettings.json',
            encoding: 'utf-8'
        }];
        
        await commitFiles('Reset global settings to defaults', files);
        
        // Update global variable
        utils.setGlobalVariable('appSettings', appSettings);
        
        utils.successMessage('Settings reset to defaults!');
        
        // Reload settings display
        settingsManager(document.getElementById('content'));
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        utils.errorHandler(error);
    }
}

