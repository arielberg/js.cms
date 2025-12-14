/**
 * Blocks Manager - Drupal-style block system
 * Blocks are content areas that can be placed in page regions
 */

import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';

/**
 * Show blocks management interface
 */
export function blocksManager(parentElement) {
    parentElement.innerHTML = `
        <div id="blocksManager" class="blocks-manager">
            <div class="manager-header">
                <h1>Blocks</h1>
                <p class="text-muted">Manage content blocks that can be placed in page regions (header, footer, sidebar, content, etc.)</p>
                <button class="btn btn-primary btn-lg" onclick="window.showBlockForm()">
                    + Create New Block
                </button>
            </div>
            
            <div id="blocksList" class="blocks-grid"></div>
        </div>
    `;
    
    loadBlocks().then(blocks => {
        displayBlocks(blocks);
    }).catch(error => {
        console.error('Error loading blocks:', error);
        displayBlocks([]);
    });
}

/**
 * Load blocks from config
 */
async function loadBlocks() {
    try {
        const cacheBuster = '?t=' + Date.now();
        let response = await fetch('/config/blocks.json' + cacheBuster);
        if (!response.ok) {
            response = await fetch('../../config/blocks.json' + cacheBuster);
        }
        if (!response.ok) {
            response = await fetch('../config/blocks.json' + cacheBuster);
        }
        if (response.ok) {
            return await response.json();
        }
        
        // Try cms-core defaults
        response = await fetch('/cms-core/config/blocks.json' + cacheBuster);
        if (!response.ok) {
            response = await fetch('../config/blocks.json' + cacheBuster);
        }
        if (response.ok) {
            return await response.json();
        }
        
        // Try GitHub API
        const gitApi = utils.getGlobalVariable('gitApi');
        const appSettings = utils.getGlobalVariable('appSettings');
        if (gitApi && appSettings && appSettings.GIT_Account !== 'your-username') {
            try {
                const content = await gitApi.getFile('config/blocks.json');
                return JSON.parse(content);
            } catch (apiError) {
                console.warn('Could not load from GitHub API:', apiError);
            }
        }
        
        return [];
    } catch (error) {
        console.error('Error loading blocks:', error);
        return [];
    }
}

/**
 * Save blocks to config
 */
async function saveBlocks(blocks) {
    const files = [{
        content: JSON.stringify(blocks, null, 4),
        filePath: 'config/blocks.json',
        encoding: 'utf-8'
    }];
    
    const gitApi = utils.getGlobalVariable('gitApi');
    if (!gitApi) {
        throw new Error('GitHub API not initialized. Please log in first.');
    }
    
    return commitFiles('Update blocks', files);
}

/**
 * Display blocks in a grid
 */
function displayBlocks(blocks) {
    const listContainer = document.getElementById('blocksList');
    
    if (blocks.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🧱</div>
                <h3>No Blocks Yet</h3>
                <p>Create your first block to add content to page regions.</p>
                <button class="btn btn-primary" onclick="window.showBlockForm()">
                    Create Your First Block
                </button>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = blocks.map((block, index) => `
        <div class="block-card" data-index="${index}">
            <div class="card-header">
                <h3>${block.title || 'Untitled Block'}</h3>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.editBlock(${index})" title="Edit">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteBlock(${index})" title="Delete">
                        Delete
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span class="label">ID:</span>
                    <code>${block.id}</code>
                </div>
                <div class="info-row">
                    <span class="label">Region:</span>
                    <span class="badge">${block.region || 'content'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Visibility:</span>
                    <span class="badge">${block.visibility || 'all'}</span>
                </div>
                ${block.contentTypes ? `
                    <div class="info-row">
                        <span class="label">Content Types:</span>
                        <span>${block.contentTypes}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    window.blocksList = blocks;
}

/**
 * Show form for creating/editing block
 */
export function showBlockForm(blockIndex = null) {
    window.showBlockForm = showBlockForm;
    const manager = document.getElementById('blocksManager');
    const blocks = window.blocksList || [];
    const block = blockIndex !== null ? blocks[blockIndex] : null;
    
    const regions = ['header', 'footer', 'sidebar', 'content', 'before-content', 'after-content'];
    
    const formHTML = `
        <div id="blockForm" class="block-form">
            <div class="form-header">
                <h2>${block ? 'Edit' : 'Create'} Block</h2>
                <button class="btn btn-sm btn-secondary" onclick="window.cancelBlockForm()">
                    × Cancel
                </button>
            </div>
            
            <form id="blockFormElement">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    <div class="form-group">
                        <label>Block ID *</label>
                        <input type="text" class="form-control" id="blockId" 
                               value="${block ? block.id : ''}" 
                               ${block ? 'readonly' : ''} 
                               placeholder="header-logo" 
                               pattern="[a-z0-9\\-]+"
                               required>
                        <small class="form-text text-muted">Unique identifier (lowercase, numbers, hyphens only)</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" class="form-control" id="blockTitle" 
                               value="${block ? block.title : ''}" 
                               placeholder="Block Title" required>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Content</h3>
                    <div class="form-group">
                        <label>Content *</label>
                        <textarea class="form-control" id="blockContent" rows="10" 
                                  placeholder="Block content (HTML allowed)" required>${block ? (block.content || '') : ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Placement</h3>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Region *</label>
                                <select class="form-control" id="blockRegion" required>
                                    ${regions.map(region => 
                                        `<option value="${region}" ${block && block.region === region ? 'selected' : ''}>
                                            ${region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ')}
                                        </option>`
                                    ).join('')}
                                </select>
                                <small class="form-text text-muted">Where this block will appear on the page</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Visibility *</label>
                                <select class="form-control" id="blockVisibility" required>
                                    <option value="all" ${block && block.visibility === 'all' ? 'selected' : ''}>All Pages</option>
                                    <option value="list" ${block && block.visibility === 'list' ? 'selected' : ''}>List Pages Only</option>
                                    <option value="single" ${block && block.visibility === 'single' ? 'selected' : ''}>Single Item Pages Only</option>
                                    <option value="homepage" ${block && block.visibility === 'homepage' ? 'selected' : ''}>Homepage Only</option>
                                    <option value="none" ${block && block.visibility === 'none' ? 'selected' : ''}>Hidden</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Content Types Filter</label>
                        <input type="text" class="form-control" id="blockContentTypes" 
                               value="${block ? (block.contentTypes || '') : ''}" 
                               placeholder="post,page (comma-separated, leave empty for all)">
                        <small class="form-text text-muted">Show this block only on these content types</small>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-lg">
                        ✓ Save Block
                    </button>
                    <button type="button" class="btn btn-secondary btn-lg" onclick="window.cancelBlockForm()">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    manager.innerHTML = formHTML;
    
    document.getElementById('blockFormElement').onsubmit = (e) => {
        e.preventDefault();
        saveBlock(blockIndex);
    };
    
    window.editingBlockIndex = blockIndex;
}

/**
 * Save block
 */
async function saveBlock(editIndex) {
    const id = document.getElementById('blockId').value.trim();
    const title = document.getElementById('blockTitle').value.trim();
    const content = document.getElementById('blockContent').value.trim();
    const region = document.getElementById('blockRegion').value;
    const visibility = document.getElementById('blockVisibility').value;
    const contentTypes = document.getElementById('blockContentTypes').value.trim();
    
    // Validation
    if (!id || !title || !content || !region || !visibility) {
        utils.errorHandler({ message: 'Please fill in all required fields' });
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(id)) {
        utils.errorHandler({ message: 'Block ID must be lowercase letters, numbers, and hyphens only' });
        return;
    }
    
    const block = {
        id,
        title,
        content,
        region,
        visibility
    };
    
    if (contentTypes) {
        block.contentTypes = contentTypes;
    }
    
    let blocks = window.blocksList || [];
    
    if (editIndex !== null) {
        blocks[editIndex] = block;
    } else {
        if (blocks.find(b => b.id === id)) {
            utils.errorHandler({ message: 'A block with this ID already exists' });
            return;
        }
        blocks.push(block);
    }
    
    const submitButton = document.querySelector('#blockFormElement button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    }
    
    try {
        await saveBlocks(blocks);
        window.blocksList = blocks;
        utils.successMessage('Block saved successfully');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error saving block:', error);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        utils.errorHandler(error);
    }
}

/**
 * Edit block
 */
function editBlock(index) {
    showBlockForm(index);
}

/**
 * Delete block
 */
async function deleteBlock(index) {
    if (!confirm('Are you sure you want to delete this block? This action cannot be undone.')) {
        return;
    }
    
    const blocks = window.blocksList || [];
    blocks.splice(index, 1);
    
    try {
        await saveBlocks(blocks);
        window.blocksList = blocks;
        utils.successMessage('Block deleted successfully');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        utils.errorHandler(error);
    }
}

/**
 * Cancel form
 */
function cancelBlockForm() {
    const manager = document.getElementById('blocksManager');
    blocksManager(manager);
}

// Expose functions to window
window.showBlockForm = showBlockForm;
window.editBlock = editBlock;
window.deleteBlock = deleteBlock;
window.cancelBlockForm = cancelBlockForm;

