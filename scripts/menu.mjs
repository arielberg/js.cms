import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';

/**
 * Get base path for GitHub Pages (e.g., /test2)
 */
// Import base path functions from utils
const getBasePath = utils.getBasePath;

/**
 * Menu Builder - Full menu editor
 */
export function menuBuilder(parentComponent) {
    const appSettings = utils.getGlobalVariable('appSettings');
    const defaultLanguage = appSettings?.Default_Language || 'en';
    const languages = appSettings?.Lanugages || ['en'];
    
    parentComponent.innerHTML = `
        <div id="menuEditor" class="menu-editor">
            <div class="manager-header">
                <h1>Menu Editor</h1>
                <p class="text-muted">Manage navigation menus for your site. You can create menu items with labels and URLs, and add sub-items for dropdown menus.</p>
            </div>
            
            <div class="menu-language-tabs mb-4">
                <ul class="nav nav-tabs" id="languageTabs" role="tablist">
                    ${languages.map(lang => `
                        <li class="nav-item">
                            <a class="nav-link ${lang === defaultLanguage ? 'active' : ''}" 
                               id="${lang}-tab" 
                               data-toggle="tab" 
                               href="#menu-${lang}" 
                               role="tab" 
                               aria-controls="menu-${lang}" 
                               aria-selected="${lang === defaultLanguage}">
                                ${appSettings?.LanugageLabels?.[lang] || lang.toUpperCase()}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="tab-content" id="menuTabsContent">
                ${languages.map(lang => `
                    <div class="tab-pane fade ${lang === defaultLanguage ? 'show active' : ''}" 
                         id="menu-${lang}" 
                         role="tabpanel" 
                         aria-labelledby="${lang}-tab">
                        <div class="menu-actions mb-3">
                            <button class="btn btn-primary" onclick="window.addMenuItem('${lang}')">
                                + Add Menu Item
                            </button>
                            <button class="btn btn-success" onclick="window.saveMenu('${lang}')">
                                💾 Save Menu
                            </button>
                        </div>
                        <div id="menuItems-${lang}" class="menu-items-list"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Load menus for all languages
    loadMenus().then(menus => {
        languages.forEach(lang => {
            displayMenuItems(lang, menus[lang] || []);
        });
    }).catch(error => {
        console.error('Error loading menus:', error);
        languages.forEach(lang => {
            displayMenuItems(lang, []);
        });
    });
    
    // Make functions globally available
    window.addMenuItem = addMenuItem;
    window.editMenuItem = editMenuItem;
    window.deleteMenuItem = deleteMenuItem;
    window.addSubItem = addSubItem;
    window.deleteSubItem = deleteSubItem;
    window.saveMenu = saveMenu;
    window.moveMenuItem = moveMenuItem;
}

/**
 * Load menus from config
 */
async function loadMenus() {
    try {
        const basePath = getBasePath();
        let response = await fetch(`${basePath}/cms-core/menus/main.json`);
        if (!response.ok) {
            response = await fetch(`${basePath}/../../cms-core/menus/main.json`);
        }
        if (!response.ok) {
            response = await fetch(`${basePath}/../cms-core/menus/main.json`);
        }
        if (response.ok) {
            return await response.json();
        }
        
        // Try GitHub API
        const gitApi = utils.getGlobalVariable('gitApi');
        if (gitApi) {
            try {
                const content = await gitApi.getFile('cms-core/menus/main.json');
                return JSON.parse(content);
            } catch (apiError) {
                console.warn('Could not load from GitHub API:', apiError);
            }
        }
        
        return {};
    } catch (error) {
        console.error('Error loading menus:', error);
        return {};
    }
}

/**
 * Save menus to config
 */
async function saveMenus(menus) {
    const files = [{
        content: JSON.stringify(menus, null, 4),
        filePath: 'cms-core/menus/main.json',
        encoding: 'utf-8'
    }];
    
    const gitApi = utils.getGlobalVariable('gitApi');
    if (!gitApi) {
        throw new Error('GitHub API not initialized. Please log in first.');
    }
    
    return commitFiles('Update menu structure', files);
}

/**
 * Display menu items for a language
 */
function displayMenuItems(language, items) {
    const container = document.getElementById(`menuItems-${language}`);
    if (!container) return;
    
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <p>No menu items yet. Click "Add Menu Item" to create your first menu item.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="menu-items-container">
            ${items.map((item, index) => renderMenuItem(language, item, index)).join('')}
        </div>
    `;
    
    // Initialize drag and drop
    initializeDragAndDrop(language);
}

/**
 * Render a single menu item
 */
function renderMenuItem(language, item, index) {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    return `
        <div class="menu-item-card card mb-3" data-index="${index}" draggable="true">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="menu-item-header">
                            <span class="drag-handle" title="Drag to reorder">☰</span>
                            <strong>${item.label || 'Untitled'}</strong>
                            <span class="badge badge-secondary ml-2">${item.url || '/'}</span>
                            ${hasSubItems ? `<span class="badge badge-info ml-2">${item.subItems.length} sub-items</span>` : ''}
                        </div>
                        ${hasSubItems ? `
                            <div class="sub-items mt-2">
                                ${item.subItems.map((subItem, subIndex) => `
                                    <div class="sub-item d-flex justify-content-between align-items-center mb-1 p-2 bg-light rounded">
                                        <span>
                                            <strong>${subItem.label || 'Untitled'}</strong>
                                            <span class="badge badge-secondary ml-2">${subItem.url || '/'}</span>
                                        </span>
                                        <div>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.editSubItem('${language}', ${index}, ${subIndex})">Edit</button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteSubItem('${language}', ${index}, ${subIndex})">Delete</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="menu-item-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.editMenuItem('${language}', ${index})">Edit</button>
                        ${!hasSubItems ? `<button class="btn btn-sm btn-outline-info" onclick="window.addSubItem('${language}', ${index})">Add Sub-item</button>` : ''}
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteMenuItem('${language}', ${index})">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize drag and drop for menu items
 */
function initializeDragAndDrop(language) {
    const container = document.querySelector(`#menuItems-${language} .menu-items-container`);
    if (!container) return;
    
    let draggedElement = null;
    
    container.querySelectorAll('.menu-item-card').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', (e) => {
            item.style.opacity = '1';
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedElement && draggedElement !== item) {
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    container.insertBefore(draggedElement, item);
                } else {
                    container.insertBefore(draggedElement, item.nextSibling);
                }
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement) {
                updateMenuOrder(language);
            }
        });
    });
}

/**
 * Update menu order after drag and drop
 */
function updateMenuOrder(language) {
    const container = document.querySelector(`#menuItems-${language} .menu-items-container`);
    if (!container) return;
    
    const items = Array.from(container.querySelectorAll('.menu-item-card'));
    // Store current menu data
    const currentMenus = window.currentMenus || {};
    const currentItems = currentMenus[language] || [];
    
    // Reorder based on DOM order
    const reorderedItems = items.map(card => {
        const index = parseInt(card.dataset.index);
        return currentItems[index];
    }).filter(item => item !== undefined);
    
    if (!window.currentMenus) window.currentMenus = {};
    window.currentMenus[language] = reorderedItems;
    
    // Update indices
    items.forEach((card, newIndex) => {
        card.dataset.index = newIndex;
    });
}

/**
 * Add a new menu item
 */
window.addMenuItem = function(language) {
    const label = prompt('Enter menu item label:');
    if (!label) return;
    
    const url = prompt('Enter menu item URL (leave empty for homepage):', '');
    
    const newItem = {
        label: label,
        url: url || ''
    };
    
    if (!window.currentMenus) window.currentMenus = {};
    if (!window.currentMenus[language]) window.currentMenus[language] = [];
    
    window.currentMenus[language].push(newItem);
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Edit a menu item
 */
window.editMenuItem = function(language, index) {
    if (!window.currentMenus || !window.currentMenus[language]) {
        loadMenus().then(menus => {
            window.currentMenus = menus;
            editMenuItem(language, index);
        });
        return;
    }
    
    const item = window.currentMenus[language][index];
    if (!item) return;
    
    const newLabel = prompt('Enter menu item label:', item.label);
    if (newLabel === null) return;
    
    const newUrl = prompt('Enter menu item URL:', item.url || '');
    if (newUrl === null) return;
    
    item.label = newLabel;
    item.url = newUrl || '';
    
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Delete a menu item
 */
window.deleteMenuItem = function(language, index) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    if (!window.currentMenus || !window.currentMenus[language]) {
        loadMenus().then(menus => {
            window.currentMenus = menus;
            deleteMenuItem(language, index);
        });
        return;
    }
    
    window.currentMenus[language].splice(index, 1);
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Add a sub-item to a menu item
 */
window.addSubItem = function(language, index) {
    if (!window.currentMenus || !window.currentMenus[language]) {
        loadMenus().then(menus => {
            window.currentMenus = menus;
            addSubItem(language, index);
        });
        return;
    }
    
    const item = window.currentMenus[language][index];
    if (!item) return;
    
    if (!item.subItems) item.subItems = [];
    
    const label = prompt('Enter sub-item label:');
    if (!label) return;
    
    const url = prompt('Enter sub-item URL:', '');
    
    item.subItems.push({
        label: label,
        url: url || ''
    });
    
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Edit a sub-item
 */
window.editSubItem = function(language, itemIndex, subIndex) {
    if (!window.currentMenus || !window.currentMenus[language]) {
        loadMenus().then(menus => {
            window.currentMenus = menus;
            editSubItem(language, itemIndex, subIndex);
        });
        return;
    }
    
    const item = window.currentMenus[language][itemIndex];
    if (!item || !item.subItems || !item.subItems[subIndex]) return;
    
    const subItem = item.subItems[subIndex];
    const newLabel = prompt('Enter sub-item label:', subItem.label);
    if (newLabel === null) return;
    
    const newUrl = prompt('Enter sub-item URL:', subItem.url || '');
    if (newUrl === null) return;
    
    subItem.label = newLabel;
    subItem.url = newUrl || '';
    
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Delete a sub-item
 */
window.deleteSubItem = function(language, itemIndex, subIndex) {
    if (!confirm('Are you sure you want to delete this sub-item?')) return;
    
    if (!window.currentMenus || !window.currentMenus[language]) {
        loadMenus().then(menus => {
            window.currentMenus = menus;
            deleteSubItem(language, itemIndex, subIndex);
        });
        return;
    }
    
    const item = window.currentMenus[language][itemIndex];
    if (!item || !item.subItems) return;
    
    item.subItems.splice(subIndex, 1);
    if (item.subItems.length === 0) {
        delete item.subItems;
    }
    
    displayMenuItems(language, window.currentMenus[language]);
};

/**
 * Save menu for a language
 */
window.saveMenu = async function(language) {
    if (!window.currentMenus || !window.currentMenus[language]) {
        utils.errorMessage('No menu changes to save');
        return;
    }
    
    try {
        // Load existing menus to preserve other languages
        const existingMenus = await loadMenus();
        const menusToSave = { ...existingMenus, [language]: window.currentMenus[language] };
        
        await saveMenus(menusToSave);
        utils.successMessage(`Menu for ${language} saved successfully!`);
        
        // Reload to get fresh data
        const updatedMenus = await loadMenus();
        window.currentMenus = updatedMenus;
        displayMenuItems(language, updatedMenus[language] || []);
    } catch (error) {
        console.error('Error saving menu:', error);
        utils.errorHandler(error);
    }
};

// Initialize menus on load
loadMenus().then(menus => {
    window.currentMenus = menus;
}).catch(error => {
    console.error('Error initializing menus:', error);
    window.currentMenus = {};
});
