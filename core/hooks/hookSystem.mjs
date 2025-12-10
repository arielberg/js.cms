/**
 * Hook System
 * Allows modules to hook into CMS events
 */

let registeredHooks = {};

/**
 * Register hooks from modules
 */
export function registerHooks(hooks) {
  Object.keys(hooks).forEach(hookName => {
    if (!registeredHooks[hookName]) {
      registeredHooks[hookName] = [];
    }
    registeredHooks[hookName] = registeredHooks[hookName].concat(hooks[hookName]);
  });
}

/**
 * Execute a hook
 * @param {string} hookName - Name of the hook
 * @param {*} data - Data to pass to hook handlers
 * @param {string} context - Optional context (e.g., content type name)
 */
export async function executeHook(hookName, data, context = null) {
  if (!registeredHooks[hookName]) {
    return data;
  }
  
  let result = data;
  
  // Execute all handlers for this hook in sequence
  for (const hookHandler of registeredHooks[hookName]) {
    try {
      // If handler is async, await it
      if (hookHandler.handler.constructor.name === 'AsyncFunction' || 
          hookHandler.handler instanceof Promise) {
        result = await hookHandler.handler(result, context);
      } else {
        result = hookHandler.handler(result, context);
      }
    } catch (error) {
      console.error(`Error in hook ${hookName} from module ${hookHandler.module}:`, error);
    }
  }
  
  return result;
}

/**
 * Execute hook synchronously (for non-async hooks)
 */
export function executeHookSync(hookName, data, context = null) {
  if (!registeredHooks[hookName]) {
    return data;
  }
  
  let result = data;
  
  for (const hookHandler of registeredHooks[hookName]) {
    try {
      result = hookHandler.handler(result, context);
    } catch (error) {
      console.error(`Error in hook ${hookName} from module ${hookHandler.module}:`, error);
    }
  }
  
  return result;
}

/**
 * Clear all registered hooks (useful for testing)
 */
export function clearHooks() {
  registeredHooks = {};
}

/**
 * Get all registered hooks (for debugging)
 */
export function getRegisteredHooks() {
  return registeredHooks;
}

