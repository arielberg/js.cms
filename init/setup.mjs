/**
 * CMS Builder Setup Wizard
 * Guides users through initial configuration
 */

let config = {
    gitAccount: '',
    gitRepository: '',
    githubToken: '',
    defaultLanguage: 'en'
};

let currentStep = 1;
const totalSteps = 4;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already configured and redirect if so
    checkIfAlreadyConfigured();
    
    // Load existing config if available
    loadExistingConfig();
    
    // Setup form handlers
    document.getElementById('repoForm').onsubmit = handleRepoSubmit;
    document.getElementById('tokenForm').onsubmit = handleTokenSubmit;
});

/**
 * Check if CMS is already configured and redirect to admin if so
 */
async function checkIfAlreadyConfigured() {
    try {
        const response = await fetch('../config/appSettings.json');
        if (!response.ok) return;
        
        const appSettings = await response.json();
        const hasSecret = localStorage.getItem('secret');
        
        // Check if properly configured
        if (appSettings.GIT_Account && 
            appSettings.GIT_Account !== 'your-username' && 
            appSettings.GIT_Account !== '' &&
            appSettings.GIT_Repository && 
            appSettings.GIT_Repository !== 'your-repo-name' && 
            appSettings.GIT_Repository !== '' &&
            hasSecret) {
            
            // Check if user wants to reconfigure
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('reconfigure') !== 'true') {
                // Already configured, redirect to admin
                const returnPath = sessionStorage.getItem('returnAfterSetup') || '../admin/index.html';
                sessionStorage.removeItem('returnAfterSetup');
                sessionStorage.setItem('setupJustCompleted', 'true'); // Mark as just completed to bypass check
                
                // Show message and redirect
                const setupContainer = document.querySelector('.setup-container');
                if (setupContainer) {
                    setupContainer.innerHTML = `
                        <div class="text-center">
                            <h2>✅ Already Configured</h2>
                            <p class="text-muted">Your CMS is already set up.</p>
                            <p>Redirecting to admin panel...</p>
                            <a href="${returnPath}" class="btn btn-primary" onclick="sessionStorage.setItem('setupJustCompleted', 'true')">Go to Admin Panel</a>
                            <a href="?reconfigure=true" class="btn btn-secondary ml-2">Reconfigure</a>
                        </div>
                    `;
                    setTimeout(() => {
                        sessionStorage.setItem('setupJustCompleted', 'true');
                        window.location.href = returnPath;
                    }, 2000);
                }
            }
        }
    } catch (error) {
        // Not configured, continue with setup
        console.log('Not configured, continuing with setup');
    }
}

/**
 * Load existing configuration if it exists
 */
async function loadExistingConfig() {
    try {
        const response = await fetch('../config/appSettings.json');
        if (response.ok) {
            const existing = await response.json();
            if (existing.GIT_Account && existing.GIT_Repository) {
                config.gitAccount = existing.GIT_Account;
                config.gitRepository = existing.GIT_Repository;
                config.defaultLanguage = existing.Default_Language || 'en';
                
                // Pre-fill forms
                document.getElementById('gitAccount').value = config.gitAccount;
                document.getElementById('gitRepository').value = config.gitRepository;
                document.getElementById('defaultLanguage').value = config.defaultLanguage;
            }
        }
    } catch (error) {
        console.log('No existing config found, starting fresh');
    }
}

/**
 * Handle repository form submission
 */
function handleRepoSubmit(event) {
    event.preventDefault();
    
    config.gitAccount = document.getElementById('gitAccount').value.trim();
    config.gitRepository = document.getElementById('gitRepository').value.trim();
    config.defaultLanguage = document.getElementById('defaultLanguage').value;
    
    if (!config.gitAccount || !config.gitRepository) {
        alert('Please fill in all fields');
        return;
    }
    
    goToStep(2);
}

/**
 * Handle token form submission
 */
function handleTokenSubmit(event) {
    event.preventDefault();
    
    config.githubToken = document.getElementById('githubToken').value.trim();
    
    if (!config.githubToken) {
        alert('Please enter your GitHub Personal Access Token');
        return;
    }
    
    goToStep(3);
    // Auto-test connection
    setTimeout(() => testConnection(), 500);
}

/**
 * Navigate to a specific step
 */
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    
    currentStep = step;
    
    // Update step display
    document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.toggle('active', i + 1 === step);
    });
    
    // Update step indicator
    document.querySelectorAll('.step-item').forEach((item, i) => {
        const stepNum = i + 1;
        item.classList.remove('active', 'completed');
        if (stepNum === step) {
            item.classList.add('active');
        } else if (stepNum < step) {
            item.classList.add('completed');
        }
    });
}

/**
 * Test GitHub connection
 */
async function testConnection() {
    const testBtn = document.getElementById('testBtn');
    const testLoading = document.getElementById('testLoading');
    const testResult = document.getElementById('testResult');
    
    testBtn.disabled = true;
    testLoading.style.display = 'inline-block';
    testResult.innerHTML = '';
    
    try {
        // Test using GitHub API
        const response = await fetch(`https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}`, {
            headers: {
                'Authorization': `token ${config.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const repo = await response.json();
            
            // Test write access by checking if we can read repository contents
            const contentsResponse = await fetch(`https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}/contents`, {
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (contentsResponse.ok || contentsResponse.status === 404) {
                // Success - repository exists and token has access
                testResult.innerHTML = `
                    <div class="test-result success">
                        <h5>✅ Connection Successful!</h5>
                        <p><strong>Repository:</strong> ${repo.full_name}</p>
                        <p><strong>Visibility:</strong> ${repo.private ? 'Private' : 'Public'}</p>
                        <p>Your token has the necessary permissions. You can proceed to save the configuration.</p>
                    </div>
                `;
                
                // Auto-advance to save after 2 seconds
                setTimeout(() => {
                    saveConfiguration();
                }, 2000);
            } else {
                throw new Error('Token does not have sufficient permissions (needs repo scope)');
            }
        } else if (response.status === 401) {
            throw new Error('Invalid token. Please check your Personal Access Token.');
        } else if (response.status === 404) {
            throw new Error('Repository not found. Please check your username and repository name.');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Connection failed');
        }
    } catch (error) {
        testResult.innerHTML = `
            <div class="test-result error">
                <h5>❌ Connection Failed</h5>
                <p><strong>Error:</strong> ${error.message}</p>
                <p class="mb-0">Please check:</p>
                <ul class="mb-0">
                    <li>Your token is correct and hasn't expired</li>
                    <li>Your token has the <strong>repo</strong> scope enabled</li>
                    <li>Your repository name and username are correct</li>
                    <li>You have access to the repository</li>
                </ul>
            </div>
        `;
    } finally {
        testBtn.disabled = false;
        testLoading.style.display = 'none';
    }
}

/**
 * Save configuration to appSettings.json
 */
async function saveConfiguration() {
    const appSettings = {
        "API_Gate": "GitHubAPI",
        "API_Params": [config.gitAccount, config.gitRepository],
        "GIT_Account": config.gitAccount,
        "GIT_Repository": config.gitRepository,
        "Lanugages": [config.defaultLanguage],
        "LanugageLabels": {
            [config.defaultLanguage]: getLanguageLabel(config.defaultLanguage)
        },
        "Admin_Lanaguage": config.defaultLanguage,
        "Default_Language": config.defaultLanguage,
        "Authentication_Mode": "token"
    };
    
    // Store token in localStorage (as the CMS expects it)
    localStorage.setItem('secret', JSON.stringify({
        name: config.gitAccount,
        token: config.githubToken
    }));
    
    // Save appSettings.json
    // Note: In a real scenario, this would need to be saved via the GitHub API
    // For now, we'll provide instructions
    const configJson = JSON.stringify(appSettings, null, 4);
    
    // Show save instructions
    const testResult = document.getElementById('testResult');
    testResult.innerHTML = `
        <div class="alert alert-info">
            <h5>💾 Save Configuration</h5>
            <p>Copy the configuration below and save it to <code>cms-core/config/appSettings.json</code>:</p>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;"><code>${escapeHtml(configJson)}</code></pre>
            <button class="btn btn-sm btn-primary mt-2" onclick="copyConfig()">Copy Configuration</button>
            <button class="btn btn-sm btn-success mt-2" onclick="saveViaAPI()">Save via API (Recommended)</button>
        </div>
    `;
    
    // Note: saveViaAPI will be called when user clicks the button
}

/**
 * Save configuration via GitHub API
 */
async function saveViaAPI() {
    const testResult = document.getElementById('testResult');
    const testBtn = document.getElementById('testBtn');
    
    testBtn.disabled = true;
    testResult.innerHTML = '<div class="alert alert-info">💾 Saving configuration to GitHub...</div>';
    
    try {
        const appSettings = {
            "API_Gate": "GitHubAPI",
            "API_Params": [config.gitAccount, config.gitRepository],
            "GIT_Account": config.gitAccount,
            "GIT_Repository": config.gitRepository,
            "Lanugages": [config.defaultLanguage],
            "LanugageLabels": {
                [config.defaultLanguage]: getLanguageLabel(config.defaultLanguage)
            },
            "Admin_Lanaguage": config.defaultLanguage,
            "Default_Language": config.defaultLanguage,
            "Authentication_Mode": "token"
        };
        
        const configJson = JSON.stringify(appSettings, null, 4);
        const configBase64 = btoa(unescape(encodeURIComponent(configJson)));
        
        // Check if file exists
        const checkResponse = await fetch(
            `https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}/contents/cms-core/config/appSettings.json`,
            {
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        let sha = null;
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            sha = existing.sha;
        }
        
        // Get default branch
        const repoResponse = await fetch(
            `https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}`,
            {
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        const repo = await repoResponse.json();
        const defaultBranch = repo.default_branch;
        
        // Get branch SHA
        const branchResponse = await fetch(
            `https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}/git/ref/heads/${defaultBranch}`,
            {
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        const branch = await branchResponse.json();
        
        // Create or update file
        const saveResponse = await fetch(
            `https://api.github.com/repos/${config.gitAccount}/${config.gitRepository}/contents/cms-core/config/appSettings.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Configure CMS Builder via setup wizard',
                    content: configBase64,
                    sha: sha,
                    branch: defaultBranch
                })
            }
        );
        
        if (saveResponse.ok) {
            // Success! Move to completion step
            testResult.innerHTML = '<div class="test-result success"><h5>✅ Configuration saved successfully!</h5><p>Redirecting...</p></div>';
            
            // Mark setup as complete in sessionStorage to bypass config check temporarily
            sessionStorage.setItem('setupJustCompleted', 'true');
            
            setTimeout(() => {
                goToStep(4);
                // Clear return path since we're completing setup
                sessionStorage.removeItem('returnAfterSetup');
            }, 1500);
        } else {
            const error = await saveResponse.json();
            throw new Error(error.message || 'Failed to save configuration');
        }
    } catch (error) {
        testResult.innerHTML = `
            <div class="test-result error">
                <h5>⚠️ Could not save automatically</h5>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please save the configuration manually:</p>
                <ol>
                    <li>Copy the configuration JSON shown above</li>
                    <li>Create/edit <code>cms-core/config/appSettings.json</code> in your repository</li>
                    <li>Paste the configuration and commit</li>
                </ol>
                <button class="btn btn-sm btn-primary mt-2" onclick="copyConfig()">Copy Configuration</button>
            </div>
        `;
    } finally {
        testBtn.disabled = false;
    }
}

/**
 * Copy configuration to clipboard
 */
function copyConfig() {
    const appSettings = {
        "API_Gate": "GitHubAPI",
        "API_Params": [config.gitAccount, config.gitRepository],
        "GIT_Account": config.gitAccount,
        "GIT_Repository": config.gitRepository,
        "Lanugages": [config.defaultLanguage],
        "LanugageLabels": {
            [config.defaultLanguage]: getLanguageLabel(config.defaultLanguage)
        },
        "Admin_Lanaguage": config.defaultLanguage,
        "Default_Language": config.defaultLanguage,
        "Authentication_Mode": "token"
    };
    
    const configJson = JSON.stringify(appSettings, null, 4);
    navigator.clipboard.writeText(configJson).then(() => {
        alert('Configuration copied to clipboard!');
    });
}

/**
 * Get language label
 */
function getLanguageLabel(code) {
    const labels = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'he': 'Hebrew',
        'ar': 'Arabic'
    };
    return labels[code] || code;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for onclick handlers
window.goToStep = goToStep;
window.testConnection = testConnection;
window.copyConfig = copyConfig;
window.saveViaAPI = saveViaAPI;

