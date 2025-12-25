/**
 * Configuration Checker
 * Checks if CMS is properly configured and redirects to setup if needed
 */

import * as utils from './utils.js';

// Import base path functions from utils
const getBasePath = utils.getBasePath;

/**
 * Check if appSettings is properly configured
 */
export async function checkConfiguration() {
  try {
    const basePath = getBasePath();
    
    // Check site config first (takes precedence), then fall back to cms-core defaults
    // Try site config at root level
    let response = await fetch(`${basePath}/config/appSettings.json`);
    if (!response.ok) {
      // Try relative path from cms-core
      response = await fetch(`${basePath}/../../config/appSettings.json`);
    }
    if (!response.ok) {
      // Try another relative path
      response = await fetch(`${basePath}/../config/appSettings.json`);
    }
    if (!response.ok) {
      // Fall back to cms-core defaults
      response = await fetch(`${basePath}/cms-core/config/appSettings.json`);
    }
    if (!response.ok) {
      // Try relative path to cms-core config
      response = await fetch(`${basePath}/../config/appSettings.json`);
    }
    if (!response.ok) {
      return { configured: false, reason: 'appSettings.json not found' };
    }
    
    const appSettings = await response.json();
    
    // Check if required fields are set
    if (!appSettings.GIT_Account || appSettings.GIT_Account === 'your-username' || appSettings.GIT_Account === '') {
      return { configured: false, reason: 'GitHub account not configured' };
    }
    
    if (!appSettings.GIT_Repository || appSettings.GIT_Repository === 'your-repo-name' || appSettings.GIT_Repository === '') {
      return { configured: false, reason: 'Repository not configured' };
    }
    
    if (!appSettings.API_Params || appSettings.API_Params.length < 2 || 
        appSettings.API_Params[0] === 'your-username' || appSettings.API_Params[1] === 'your-repo-name') {
      return { configured: false, reason: 'API parameters not configured' };
    }
    
    // Check if token exists in localStorage
    const secret = localStorage.getItem('secret');
    if (!secret) {
      return { configured: false, reason: 'GitHub token not found. Please login or run setup wizard.' };
    }
    
    try {
      const secretData = JSON.parse(secret);
      if (!secretData.token || secretData.token === '') {
        return { configured: false, reason: 'GitHub token is empty' };
      }
    } catch (e) {
      return { configured: false, reason: 'Invalid token storage format' };
    }
    
    return { configured: true };
  } catch (error) {
    return { configured: false, reason: `Configuration check failed: ${error.message}` };
  }
}

/**
 * Redirect to setup wizard if not configured
 */
export async function ensureConfigured() {
  // If setup was just completed, skip the check temporarily
  if (sessionStorage.getItem('setupJustCompleted') === 'true') {
    sessionStorage.removeItem('setupJustCompleted');
    return true; // Allow access, config was just saved
  }
  
  const configCheck = await checkConfiguration();
  
  if (!configCheck.configured) {
    // Store current path to return after setup
    const currentPath = window.location.pathname;
    if (currentPath && !currentPath.includes('/init/')) {
      sessionStorage.setItem('returnAfterSetup', currentPath);
    }
    
    // Redirect to setup wizard
    // Use full absolute path
    const initPath = 'init';
    
    window.location.href = window.location.href+initPath;
    return false;
  }
  
  return true;
}
