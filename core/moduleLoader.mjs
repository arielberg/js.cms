/**
 * Module Loader System
 * Scans and loads modules from cms-core/modules/
 */

// Utils not needed in module loader - removed import

/**
 * Load all modules from the modules directory
 */
export async function loadModules() {
  const modules = [];
  const moduleRegistry = await getModuleRegistry();
  
  // Load each active module
  for (const moduleName of moduleRegistry.active) {
    try {
      const module = await loadModule(moduleName);
      if (module) {
        modules.push(module);
      }
    } catch (error) {
      console.error(`Failed to load module ${moduleName}:`, error);
    }
  }
  
  return modules;
}

/**
 * Load a single module
 */
async function loadModule(moduleName) {
  // Calculate base path from current location
  const currentPath = window.location.pathname;
  let basePath = '/cms-core';
  
  if (currentPath.includes('/cms-core/admin/')) {
    basePath = '/cms-core';
  } else if (currentPath.includes('/admin/')) {
    basePath = currentPath.substring(0, currentPath.indexOf('/admin'));
  }
  
  let modulePath = null;
  let moduleConfig = null;
  
  try {
    // Try multiple paths to find module
    const paths = [
      `${basePath}/modules/${moduleName}/module.json`,
      `/cms-core/modules/${moduleName}/module.json`,
      `../modules/${moduleName}/module.json`,
      `../../modules/${moduleName}/module.json`
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          moduleConfig = await response.json();
          // Determine the correct module path for subsequent loads
          modulePath = path.replace('/module.json', '');
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (!moduleConfig) {
      console.warn(`Module ${moduleName} has no module.json at path: ${modulePath}`);
      return null;
    }
    
    if (!modulePath) {
      // Fallback to base path
      modulePath = `${basePath}/modules/${moduleName}`;
    }
    
    // Load content types from module (try multiple paths)
    const modulePaths = [
      modulePath,
      `${basePath}/modules/${moduleName}`,
      `/cms-core/modules/${moduleName}`,
      `../modules/${moduleName}`,
      `../../modules/${moduleName}`
    ];
    
    let contentTypes = [];
    for (const path of modulePaths) {
      const result = await loadModuleContentTypes(path);
      if (result && Array.isArray(result) && result.length > 0) {
        contentTypes = result;
        break;
      }
    }
    
    // Load hooks from module
    let hooks = {};
    const hookPaths = [
      `${basePath}/modules/${moduleName}/hooks.mjs`,
      `/cms-core/modules/${moduleName}/hooks.mjs`,
      `../modules/${moduleName}/hooks.mjs`,
      `../../modules/${moduleName}/hooks.mjs`
    ];
    
    for (const hookPath of hookPaths) {
      try {
        const hookModule = await import(hookPath);
        hooks = hookModule.hooks || {};
        break; // Success, exit loop
      } catch (e) {
        // Continue to next path
      }
    }
    
    // Load templates from module
    const templates = await loadModuleTemplates(modulePath);
    
    return {
      name: moduleName,
      config: moduleConfig,
      contentTypes: contentTypes || [],
      hooks: hooks || {},
      templates: templates || {},
      path: modulePath
    };
  } catch (error) {
    console.error(`Error loading module ${moduleName}:`, error);
    return null;
  }
}

/**
 * Load content types from a module
 */
async function loadModuleContentTypes(modulePath) {
  try {
    const response = await fetch(`${modulePath}/contentTypes.json`);
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
    return null;
  } catch (error) {
    // Module may not have contentTypes.json
    return null;
  }
}

/**
 * Load hooks from a module
 */
async function loadModuleHooks(modulePath) {
  try {
    // Try to import hooks - need to construct proper import path
    // Since we can't use dynamic imports with relative paths easily,
    // we'll return empty and let the caller handle multiple attempts
    const module = await import(`${modulePath}/hooks.mjs`);
    return module.hooks || {};
  } catch (error) {
    // Module may not have hooks - return null to indicate failure
    throw error;
  }
}

/**
 * Load templates from a module
 */
async function loadModuleTemplates(modulePath) {
  // Templates are loaded on-demand, just return the path
  return {
    path: `${modulePath}/templates`
  };
}

/**
 * Get module registry (which modules are active)
 */
async function getModuleRegistry() {
  try {
    // Calculate path based on current location
    const currentPath = window.location.pathname;
    let basePath = '';
    
    // Determine base path from current URL
    if (currentPath.includes('/cms-core/admin/')) {
      basePath = '/cms-core';
    } else if (currentPath.includes('/admin/')) {
      basePath = currentPath.substring(0, currentPath.indexOf('/admin'));
    } else {
      basePath = '/cms-core';
    }
    
    // Try multiple paths
    const paths = [
      `${basePath}/config/modules.json`,
      '/cms-core/config/modules.json',
      '../config/modules.json',
      '../../config/modules.json'
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // Return default registry if file doesn't exist
    return { active: [], disabled: [] };
  } catch (error) {
    console.warn('Could not load modules.json:', error);
    return { active: [], disabled: [] };
  }
}

/**
 * Merge content types from all modules
 */
export function mergeContentTypes(modules) {
  let allContentTypes = [];
  
  modules.forEach(module => {
    if (module.contentTypes && module.contentTypes.length > 0) {
      // Add module name to each content type for tracking
      const moduleContentTypes = module.contentTypes.map(ct => ({
        ...ct,
        _module: module.name
      }));
      allContentTypes = allContentTypes.concat(moduleContentTypes);
    }
  });
  
  return allContentTypes;
}

/**
 * Merge hooks from all modules
 */
export function mergeHooks(modules) {
  const mergedHooks = {};
  
  modules.forEach(module => {
    if (module.hooks) {
      Object.keys(module.hooks).forEach(hookName => {
        if (!mergedHooks[hookName]) {
          mergedHooks[hookName] = [];
        }
        mergedHooks[hookName].push({
          module: module.name,
          handler: module.hooks[hookName]
        });
      });
    }
  });
  
  return mergedHooks;
}

