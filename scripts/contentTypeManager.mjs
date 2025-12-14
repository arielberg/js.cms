/**
 * Content Type Manager - Rebuilt
 * Modern interface for creating and managing content types with fields
 */

import * as utils from './utils.js';
import { commitFiles } from './contentItem.mjs';
import { isFixedContentType, getFixedContentTypes } from '../core/fixedContentTypes.mjs';

let fieldCounter = 0;

/**
 * Show content type management interface
 */
export function contentTypeManager(parentElement) {
    // Expose functions to window for onclick handlers (defined below)
    // These will be set when the functions are defined
    
    parentElement.innerHTML = `
        <div id="contentTypeManager" class="content-type-manager">
            <div class="manager-header">
                <h1>Content Types</h1>
                <p class="text-muted">Create and manage content types for your CMS. Each content type defines a structure for your content items.</p>
                <button class="btn btn-primary btn-lg" onclick="window.showContentTypeForm()">
                    + Create New Content Type
                </button>
            </div>
            
            <div id="contentTypesList" class="content-types-grid"></div>
        </div>
    `;
    
    // Load content types with cache-busting
    loadContentTypes().then(configContentTypes => {
        // Merge with fixed content types
        const fixedContentTypes = getFixedContentTypes();
        const allContentTypesMap = new Map();
        
        // Fixed types first, then config types (config can override fixed if needed)
        [...fixedContentTypes, ...configContentTypes].forEach(ct => {
            allContentTypesMap.set(ct.name, ct);
        });
        
        const allContentTypes = Array.from(allContentTypesMap.values());
        
        // Store in window for form editing
        window.contentTypesList = allContentTypes;
        displayContentTypes(allContentTypes);
    }).catch(error => {
        console.error('Error loading content types:', error);
        // Still show fixed types even if config fails to load
        const fixedContentTypes = getFixedContentTypes();
        window.contentTypesList = fixedContentTypes;
        displayContentTypes(fixedContentTypes);
    });
}

/**
 * Load content types from config
 * Tries site config first, then cms-core defaults, then GitHub API as last resort
 */
async function loadContentTypes() {
    try {
        // Add cache-busting to ensure fresh data
        const cacheBuster = '?t=' + Date.now();
        
        // Try site config first (local fetch)
        let response = await fetch('/config/contentTypes.json' + cacheBuster);
        if (!response.ok) {
            response = await fetch('../../config/contentTypes.json' + cacheBuster);
        }
        if (!response.ok) {
            response = await fetch('../config/contentTypes.json' + cacheBuster);
        }
        if (response.ok) {
            const data = await response.json();
            console.log('Loaded content types from local file:', data);
            return data;
        }
        
        // Fall back to cms-core defaults
        response = await fetch('/cms-core/config/contentTypes.json' + cacheBuster);
        if (!response.ok) {
            response = await fetch('../config/contentTypes.json' + cacheBuster);
        }
        if (response.ok) {
            const data = await response.json();
            console.log('Loaded content types from cms-core defaults:', data);
            return data;
        }
        
        // Last resort: try GitHub API (only if gitApi is available and configured)
        const gitApi = utils.getGlobalVariable('gitApi');
        const appSettings = utils.getGlobalVariable('appSettings');
        if (gitApi && appSettings && appSettings.GIT_Account !== 'your-username') {
            try {
                console.log('Loading content types from GitHub API...');
                const content = await gitApi.getFile('config/contentTypes.json');
                const data = JSON.parse(content);
                console.log('Loaded content types from GitHub API:', data);
                return data;
            } catch (apiError) {
                console.warn('Could not load from GitHub API, using empty array:', apiError);
            }
        }
        
        console.log('No content types found, returning empty array');
        return [];
    } catch (error) {
        console.error('Error loading content types:', error);
        return [];
    }
}

/**
 * Save content types to config
 */
async function saveContentTypes(contentTypes) {
    console.log('saveContentTypes called with:', contentTypes);
    
    // Save to site config directory (not cms-core)
    const files = [{
        content: JSON.stringify(contentTypes, null, 4),
        filePath: 'config/contentTypes.json',
        encoding: 'utf-8'
    }];
    
    console.log('Files to commit:', files);
    console.log('Calling commitFiles...');
    
    const gitApi = utils.getGlobalVariable('gitApi');
    if (!gitApi) {
        throw new Error('GitHub API not initialized. Please log in first.');
    }
    
    return commitFiles('Update content types', files);
}

/**
 * Display content types in a modern card grid
 */
function displayContentTypes(contentTypes) {
    const listContainer = document.getElementById('contentTypesList');
    
    if (contentTypes.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No Content Types Yet</h3>
                <p>Create your first content type to start building your CMS structure.</p>
                <button class="btn btn-primary" onclick="window.showContentTypeForm()">
                    Create Your First Content Type
                </button>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = contentTypes.map((ct, index) => {
        const isFixed = ct.fixed || isFixedContentType(ct.name);
        return `
        <div class="content-type-card" data-index="${index}">
            <div class="card-header">
                <h3>${ct.label} ${isFixed ? '<span class="badge badge-info" title="Fixed content type - cannot be deleted">Fixed</span>' : ''}</h3>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.editContentType(${index})" title="Edit">
                        Edit
                    </button>
                    ${!isFixed ? `<button class="btn btn-sm btn-danger" onclick="window.deleteContentType(${index})" title="Delete">
                        Delete
                    </button>` : '<span class="text-muted" style="font-size: 0.85em;">Cannot delete</span>'}
                </div>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span class="label">ID:</span>
                    <code>${ct.name}</code>
                </div>
                <div class="info-row">
                    <span class="label">URL:</span>
                    <code>/${ct.urlPrefix}</code>
                </div>
                <div class="info-row">
                    <span class="label">Fields:</span>
                    <span class="badge">${ct.fields ? ct.fields.length : 0}</span>
                </div>
                ${ct.fields && ct.fields.length > 0 ? `
                    <div class="fields-preview">
                        ${ct.fields.slice(0, 3).map(f => `<span class="field-tag">${f.label}</span>`).join('')}
                        ${ct.fields.length > 3 ? `<span class="field-tag">+${ct.fields.length - 3} more</span>` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <a href="#${ct.name}/all" class="btn btn-sm btn-outline-primary">View All</a>
                <a href="#${ct.name}/new" class="btn btn-sm btn-outline-success">Add New</a>
            </div>
        </div>
    `;
    }).join('');
    
    window.contentTypesList = contentTypes;
}

/**
 * Show form for creating/editing content type
 */
export function showContentTypeForm(contentTypeIndex = null) {
    window.showContentTypeForm = showContentTypeForm; // Expose to window
    const manager = document.getElementById('contentTypeManager');
    const contentTypes = window.contentTypesList || [];
    const contentType = contentTypeIndex !== null ? contentTypes[contentTypeIndex] : null;
    
    fieldCounter = 0;
    
    const formHTML = `
        <div id="contentTypeForm" class="content-type-form">
            <div class="form-header">
                <h2>${contentType ? 'Edit' : 'Create'} Content Type</h2>
                <button class="btn btn-sm btn-secondary" onclick="window.cancelContentTypeForm()">
                    × Cancel
                </button>
            </div>
            
            <form id="contentTypeFormElement">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Name (ID) *</label>
                                <input type="text" class="form-control" id="ctName" 
                                       value="${contentType ? contentType.name : ''}" 
                                       ${contentType ? 'readonly' : ''} 
                                       placeholder="post" 
                                       pattern="[a-z0-9\\-]+"
                                       required>
                                <small class="form-text text-muted">Unique identifier (lowercase, numbers, hyphens only)</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>URL Prefix *</label>
                                <div class="input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">/</span>
                                    </div>
                                    <input type="text" class="form-control" id="ctUrlPrefix" 
                                           value="${contentType ? contentType.urlPrefix : ''}" 
                                           placeholder="post/" required>
                                </div>
                                <small class="form-text text-muted">URL path for content items</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Label (Singular) *</label>
                                <input type="text" class="form-control" id="ctLabel" 
                                       value="${contentType ? contentType.label : ''}" 
                                       placeholder="Blog Post" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Label (Plural) *</label>
                                <input type="text" class="form-control" id="ctLabelPlural" 
                                       value="${contentType ? contentType.labelPlural : ''}" 
                                       placeholder="Blog Posts" required>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="section-header">
                        <h3>Fields</h3>
                        <button type="button" class="btn btn-sm btn-primary" onclick="window.addField()">
                            + Add Field
                        </button>
                    </div>
                    <p class="text-muted">Define the fields that will be available for this content type.</p>
                    
                    <div id="fieldsList" class="fields-list">
                        ${contentType && contentType.fields ? 
                            contentType.fields.map((field, idx) => renderFieldEditor(field, idx)).join('') : 
                            '<div class="empty-fields">No fields yet. Click "Add Field" to get started.</div>'}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-lg" id="saveContentTypeButton">
                        ✓ Save Content Type
                    </button>
                    <button type="button" class="btn btn-secondary btn-lg" onclick="window.cancelContentTypeForm()">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    manager.innerHTML = formHTML;
    
    const form = document.getElementById('contentTypeFormElement');
    const submitButton = document.getElementById('saveContentTypeButton');
    
    // Handle form submission
    form.onsubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted, calling saveContentType with index:', contentTypeIndex);
        try {
            saveContentType(contentTypeIndex);
        } catch (error) {
            console.error('Error in form submission handler:', error);
            utils.errorHandler({ message: 'Error submitting form: ' + (error.message || error) });
        }
    };
    
    // Also handle button click as fallback
    submitButton.onclick = (e) => {
        e.preventDefault();
        console.log('Submit button clicked, calling saveContentType with index:', contentTypeIndex);
        try {
            saveContentType(contentTypeIndex);
        } catch (error) {
            console.error('Error in button click handler:', error);
            utils.errorHandler({ message: 'Error submitting form: ' + (error.message || error) });
        }
    };
    
    window.editingContentTypeIndex = contentTypeIndex;
    
    // Initialize field drag and drop if fields exist
    if (contentType && contentType.fields && contentType.fields.length > 0) {
        initializeFieldDragDrop();
    }
}

/**
 * Render field editor with improved UI
 */
function renderFieldEditor(field, index) {
    const fieldTypes = [
        { value: 'textfield', label: 'Text Field', icon: 'fa-font' },
        { value: 'textarea', label: 'Textarea', icon: 'fa-align-left' },
        { value: 'wysiwyg', label: 'Rich Text', icon: 'fa-file-alt' },
        { value: 'date', label: 'Date', icon: 'fa-calendar' },
        { value: 'image', label: 'Image', icon: 'fa-image' },
        { value: 'file', label: 'File', icon: 'fa-file' },
        { value: 'url', label: 'URL', icon: 'fa-link' },
        { value: 'select', label: 'Select', icon: 'fa-list' }
    ];
    
    const fieldId = `field_${fieldCounter++}`;
    const isSelect = field.type === 'select';
    const hasPlaceholder = ['textfield', 'textarea', 'wysiwyg'].includes(field.type);
    
    let selectValuesHTML = '';
    if (isSelect && field.values) {
        selectValuesHTML = Object.entries(field.values)
            .map(([key, val]) => `${key}:${val}`)
            .join('\n');
    }
    
    return `
        <div class="field-editor" data-field-index="${index}" data-field-id="${fieldId}">
            <div class="field-header">
                <div class="field-drag-handle" title="Drag to reorder">
                    ☰
                </div>
                <div class="field-title">
                    <strong>${field.label || 'New Field'}</strong>
                    <span class="field-type-badge">${fieldTypes.find(t => t.value === field.type)?.label || field.type}</span>
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.removeField('${fieldId}')">
                    × Remove
                </button>
            </div>
            
            <div class="field-body">
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Field Name *</label>
                            <input type="text" class="form-control field-name" 
                                   value="${field.name || ''}" 
                                   placeholder="title" 
                                   required
                                   pattern="[a-z0-9\\-_]+">
                            <small class="form-text text-muted">Internal identifier</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Label *</label>
                            <input type="text" class="form-control field-label" 
                                   value="${field.label || ''}" 
                                   placeholder="Title" 
                                   required>
                            <small class="form-text text-muted">Display label</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Type *</label>
                            <select class="form-control field-type" onchange="window.updateFieldType('${fieldId}')">
                                ${fieldTypes.map(type => 
                                    `<option value="${type.value}" ${field.type === type.value ? 'selected' : ''}>
                                        ${type.label}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" class="field-i18n" 
                                       ${field.i18n !== false ? 'checked' : ''}>
                                Internationalization (i18n)
                            </label>
                            <small class="form-text text-muted">Enable translations for this field</small>
                        </div>
                    </div>
                </div>
                
                ${isSelect ? `
                    <div class="field-options">
                        <label>Select Options *</label>
                        <textarea class="form-control field-values" rows="4" 
                                  placeholder="key1:Value 1&#10;key2:Value 2&#10;key3:Value 3">${selectValuesHTML}</textarea>
                        <small class="form-text text-muted">One option per line, format: key:value</small>
                    </div>
                ` : ''}
                
                ${hasPlaceholder ? `
                    <div class="field-options">
                        <label>Placeholder Text</label>
                        <input type="text" class="form-control field-placeholder" 
                               value="${field.placeholder || ''}" 
                               placeholder="Enter text...">
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Add new field
 */
function addField() {
    const fieldsList = document.getElementById('fieldsList');
    const emptyMsg = fieldsList.querySelector('.empty-fields');
    if (emptyMsg) emptyMsg.remove();
    
    const fieldIndex = fieldsList.children.length;
    const newField = {
        name: '',
        label: '',
        type: 'textfield',
        i18n: true
    };
    
    fieldsList.insertAdjacentHTML('beforeend', renderFieldEditor(newField, fieldIndex));
    initializeFieldDragDrop();
};

/**
 * Remove field
 */
function removeField(fieldId) {
    const fieldEditor = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldEditor) {
        fieldEditor.remove();
        updateFieldIndices();
        
        const fieldsList = document.getElementById('fieldsList');
        if (fieldsList.children.length === 0) {
            fieldsList.innerHTML = '<div class="empty-fields">No fields yet. Click "Add Field" to get started.</div>';
        }
    }
};

/**
 * Update field type
 */
function updateFieldType(fieldId) {
    const fieldEditor = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!fieldEditor) return;
    
    const typeSelect = fieldEditor.querySelector('.field-type');
    const type = typeSelect.value;
    const field = getFieldData(fieldEditor);
    field.type = type;
    
    const index = fieldEditor.getAttribute('data-field-index');
    const newHTML = renderFieldEditor(field, index);
    fieldEditor.outerHTML = newHTML;
    initializeFieldDragDrop();
};

/**
 * Initialize drag and drop for fields
 */
function initializeFieldDragDrop() {
    const fieldsList = document.getElementById('fieldsList');
    if (!fieldsList) return;
    
    Array.from(fieldsList.children).forEach(fieldEditor => {
        const handle = fieldEditor.querySelector('.field-drag-handle');
        if (handle) {
            fieldEditor.draggable = true;
            fieldEditor.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', fieldEditor.outerHTML);
                fieldEditor.classList.add('dragging');
            });
            
            fieldEditor.addEventListener('dragend', () => {
                fieldEditor.classList.remove('dragging');
            });
            
            fieldEditor.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const afterElement = getDragAfterElement(fieldsList, e.clientY);
                const dragging = fieldsList.querySelector('.dragging');
                if (afterElement == null) {
                    fieldsList.appendChild(dragging);
                } else {
                    fieldsList.insertBefore(dragging, afterElement);
                }
            });
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.field-editor:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Update field indices
 */
function updateFieldIndices() {
    const fieldsList = document.getElementById('fieldsList');
    Array.from(fieldsList.children).forEach((fieldEditor, index) => {
        fieldEditor.setAttribute('data-field-index', index);
    });
}

/**
 * Get field data from editor
 */
function getFieldData(fieldEditor) {
    const name = fieldEditor.querySelector('.field-name').value;
    const label = fieldEditor.querySelector('.field-label').value;
    const type = fieldEditor.querySelector('.field-type').value;
    const i18nCheckbox = fieldEditor.querySelector('.field-i18n');
    const i18n = i18nCheckbox ? i18nCheckbox.checked : true;
    
    const field = {
        name,
        label,
        type,
        i18n
    };
    
    if (type === 'select') {
        const valuesText = fieldEditor.querySelector('.field-values')?.value || '';
        const values = {};
        valuesText.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const [key, ...valParts] = trimmed.split(':');
                if (key && valParts.length > 0) {
                    values[key.trim()] = valParts.join(':').trim();
                }
            }
        });
        if (Object.keys(values).length > 0) {
            field.values = values;
        }
    }
    
    if (['textfield', 'textarea', 'wysiwyg'].includes(type)) {
        const placeholder = fieldEditor.querySelector('.field-placeholder')?.value;
        if (placeholder) {
            field.placeholder = placeholder;
        }
    }
    
    return field;
}

/**
 * Save content type
 */
async function saveContentType(editIndex) {
    console.log('saveContentType called with editIndex:', editIndex);
    
    const name = document.getElementById('ctName').value.trim();
    const label = document.getElementById('ctLabel').value.trim();
    const labelPlural = document.getElementById('ctLabelPlural').value.trim();
    const urlPrefix = document.getElementById('ctUrlPrefix').value.trim().replace(/^\/+/, '');
    
    // Validation
    if (!name || !label || !labelPlural || !urlPrefix) {
        utils.errorHandler({ message: 'Please fill in all required fields' });
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(name)) {
        utils.errorHandler({ message: 'Name must be lowercase letters, numbers, and hyphens only' });
        return;
    }
    
    const fieldsList = document.getElementById('fieldsList');
    const fields = Array.from(fieldsList.querySelectorAll('.field-editor'))
        .map(fieldEditor => getFieldData(fieldEditor))
        .filter(field => field.name && field.label);
    
    if (fields.length === 0) {
        utils.errorHandler({ message: 'At least one field is required' });
        return;
    }
    
    // Validate field names
    const fieldNames = fields.map(f => f.name);
    const uniqueNames = new Set(fieldNames);
    if (fieldNames.length !== uniqueNames.size) {
        utils.errorHandler({ message: 'Field names must be unique' });
        return;
    }
    
    // Validate select fields
    for (const field of fields) {
        if (field.type === 'select' && (!field.values || Object.keys(field.values).length === 0)) {
            utils.errorHandler({ message: `Field "${field.label}" (select type) must have at least one option` });
            return;
        }
    }
    
    const contentType = {
        name,
        label,
        labelPlural,
        urlPrefix: urlPrefix.endsWith('/') ? urlPrefix : urlPrefix + '/',
        fields
    };
    
    let contentTypes = window.contentTypesList || [];
    
    // Check if trying to edit/override a fixed content type
    if (isFixedContentType(name)) {
        // Allow editing fixed types but warn user
        if (!confirm('You are editing a fixed content type. Changes will be saved but the content type will always be available. Continue?')) {
            return;
        }
    }
    
    if (editIndex !== null) {
        contentTypes[editIndex] = contentType;
    } else {
        if (contentTypes.find(ct => ct.name === name)) {
            utils.errorHandler({ message: 'A content type with this name already exists' });
            return;
        }
        contentTypes.push(contentType);
    }
    
    // Get submit button and disable it, show loading state
    const submitButton = document.querySelector('#contentTypeFormElement button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    }
    
    console.log('Starting to save content types:', contentTypes);
    
    try {
        console.log('Calling saveContentTypes...');
        
        // Filter out fixed content types before saving (they're always loaded from code)
        const fixedContentTypes = getFixedContentTypes();
        const fixedTypeNames = new Set(fixedContentTypes.map(ct => ct.name));
        const contentTypesToSave = contentTypes.filter(ct => !fixedTypeNames.has(ct.name));
        
        const result = await saveContentTypes(contentTypesToSave);
        console.log('saveContentTypes result:', result);
        
        // Clear cached content types from localStorage to force fresh load
        localStorage.removeItem('configContentTypes');
        localStorage.removeItem('contentTypes');
        
        // Update global variable immediately (include fixed types)
        window.contentTypesList = contentTypes;
        utils.setGlobalVariable('contentTypes', contentTypes);
        utils.setGlobalVariable('configContentTypes', contentTypesToSave);
        
        console.log('Content type saved successfully');
        utils.successMessage('Content type saved successfully');
        
        // Wait a bit for GitHub API to propagate, then reload
        setTimeout(() => {
            // Clear cache again before reload
            localStorage.removeItem('configContentTypes');
            localStorage.removeItem('contentTypes');
            location.reload();
        }, 2000);
    } catch (error) {
        console.error('Error saving content type:', error);
        console.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            error: error
        });
        
        // Restore button state on error
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        
        // Ensure error has a message property
        const errorObj = error && typeof error === 'object' && error.message 
            ? error 
            : { message: error?.toString() || 'Unknown error occurred while saving content type' };
        
        utils.errorHandler(errorObj);
        
        // Also show alert as fallback
        alert('Error saving content type: ' + (errorObj.message || 'Unknown error'));
    }
}

/**
 * Edit content type
 */
function editContentType(index) {
    showContentTypeForm(index);
};

/**
 * Delete content type
 */
async function deleteContentType(index) {
    const contentTypes = window.contentTypesList || [];
    const contentType = contentTypes[index];
    
    // Check if it's a fixed content type
    if (contentType && (contentType.fixed || isFixedContentType(contentType.name))) {
        utils.errorHandler({ message: 'Cannot delete fixed content types (pages and blocks are always available)' });
        return;
    }
    
    if (!confirm('Are you sure you want to delete this content type? This action cannot be undone.')) {
        return;
    }
    
    contentTypes.splice(index, 1);
    
    try {
        await saveContentTypes(contentTypes);
        window.contentTypesList = contentTypes;
        utils.successMessage('Content type deleted successfully');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        utils.errorHandler(error);
    }
};

/**
 * Cancel form
 */
function cancelContentTypeForm() {
    const manager = document.getElementById('contentTypeManager');
    contentTypeManager(manager);
}

// Expose all functions to window for onclick handlers
window.showContentTypeForm = showContentTypeForm;
window.addField = addField;
window.removeField = removeField;
window.updateFieldType = updateFieldType;
window.editContentType = editContentType;
window.deleteContentType = deleteContentType;
window.cancelContentTypeForm = cancelContentTypeForm;
