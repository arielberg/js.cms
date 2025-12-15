import * as utils from './utils.js';

/**
 * Get base path for GitHub Pages (e.g., /test2)
 */
function getBasePath() {
  const githubPagesMatch = window.location.href.match(/github\.io\/([^/]+)/);
  if (githubPagesMatch) {
    const repoName = githubPagesMatch[1];
    const currentPath = window.location.pathname;
    if (currentPath.startsWith(`/${repoName}/`)) {
      return `/${repoName}`;
    } else if (currentPath === `/${repoName}`) {
      return `/${repoName}`;
    }
  }
  return '';
}

/**
 * Resolve effective base path using settings (BasePath_Mode / BasePath_Value) with URL fallback
 */
function getEffectiveBasePath() {
  const urlBase = getBasePath();
  try {
    const settings = utils.getGlobalVariable('appSettings') || {};
    const mode = settings.BasePath_Mode || 'auto';
    if (mode === 'set' && settings.BasePath_Value) {
      return settings.BasePath_Value;
    }
    if (mode === 'relative') return '';
    return urlBase;
  } catch (e) {
    return urlBase;
  }
}

/**
 * Fetch CSS file content with multiple path fallbacks
 */
async function fetchCSS(filePath, basePath = '') {
  const pathsToTry = [];
  
  // Add base path version
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  
  // Add root path version
  pathsToTry.push(`/${filePath}`);
  
  // Add relative path version
  pathsToTry.push(filePath);
  
  // Try GitHub API as fallback
  const APIconnect = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded CSS from: ${path}`);
        return content;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  // Try GitHub API if available
  if (APIconnect && APIconnect.getFile) {
    try {
      const content = await APIconnect.getFile(filePath);
      console.log(`Successfully loaded CSS from GitHub API: ${filePath}`);
      return content;
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for CSS ${filePath}:`, apiError);
    }
  }
  
  console.warn(`Failed to fetch CSS ${filePath} from all attempted paths`);
  return null;
}

/**
 * Fetch JS file content with multiple path fallbacks
 */
async function fetchJS(filePath, basePath = '') {
  const pathsToTry = [];
  
  // Add base path version
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  
  // Add root path version
  pathsToTry.push(`/${filePath}`);
  
  // Add relative path version
  pathsToTry.push(filePath);
  
  // Try GitHub API as fallback
  const APIconnect = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded JS from: ${path}`);
        return content;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  // Try GitHub API if available
  if (APIconnect && APIconnect.getFile) {
    try {
      const content = await APIconnect.getFile(filePath);
      console.log(`Successfully loaded JS from GitHub API: ${filePath}`);
      return content;
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for JS ${filePath}:`, apiError);
    }
  }
  
  console.warn(`Failed to fetch JS ${filePath} from all attempted paths`);
  return null;
}

/**
 * Get effective base path based on settings
 */
function getEffectiveBasePath() {
  const appSettings = utils.getGlobalVariable('appSettings') || {};
  const basePathMode = appSettings.BasePath_Mode || 'auto';
  
  if (basePathMode === 'set') {
    return appSettings.BasePath_Value || '';
  } else if (basePathMode === 'relative') {
    return '';
  } else {
    // Auto-detect
    return getBasePath();
  }
}

/**
 * Inline CSS and JS assets into HTML content (respects settings)
 */
async function inlineAssets(htmlContent, basePath = '') {
  const appSettings = utils.getGlobalVariable('appSettings') || {};
  const cssMode = appSettings.CSS_Mode || 'embed';
  const jsMode = appSettings.JS_Mode || 'embed';
  
  // Use effective base path
  const effectiveBasePath = getEffectiveBasePath();
  const assetBasePath = effectiveBasePath || basePath;
  
  let finalHtml = htmlContent;
  
  // Handle CSS
  if (cssMode === 'embed') {
    // Fetch and inline CSS files
    const cssFiles = [
      'assets/css/style.css',
      'assets/css/bootstrap.min.css'
    ];
    
    let inlineStyles = '';
    for (const cssFile of cssFiles) {
      try {
        const cssContent = await fetchCSS(cssFile, assetBasePath);
        if (cssContent) {
          inlineStyles += `<style>${cssContent}</style>\n`;
          console.log(`✓ Inlined CSS: ${cssFile}`);
        }
      } catch (error) {
        console.warn(`Error loading CSS ${cssFile}:`, error);
      }
    }
    
    // Remove CSS link tags and inject inline styles
    if (inlineStyles) {
      finalHtml = finalHtml.replace(/<link[^>]*href=["']?assets\/css\/[^"']+["']?[^>]*>/gi, '');
      finalHtml = finalHtml.replace('</head>', inlineStyles + '</head>');
    }
  } else {
    // Link mode - update CSS paths to use correct base path
    if (assetBasePath) {
      finalHtml = finalHtml.replace(
        /<link[^>]*href=["'](assets\/css\/[^"']+)["']/gi,
        `<link rel="stylesheet" type="text/css" href="${assetBasePath}/$1"`
      );
    }
  }
  
  // Handle JS
  if (jsMode === 'embed') {
    // Fetch and inline JS files
    const jsFiles = [
      'assets/scripts/main.js'
    ];
    
    let inlineScripts = '';
    for (const jsFile of jsFiles) {
      try {
        const jsContent = await fetchJS(jsFile, assetBasePath);
        if (jsContent) {
          inlineScripts += `<script type="text/javascript">${jsContent}</script>\n`;
          console.log(`✓ Inlined JS: ${jsFile}`);
        }
      } catch (error) {
        console.warn(`Error loading JS ${jsFile}:`, error);
      }
    }
    
    // Remove JS script tags and inject inline scripts
    if (inlineScripts) {
      finalHtml = finalHtml.replace(/<script[^>]*src=["']?assets\/scripts\/[^"']+["']?[^>]*><\/script>/gi, '');
      finalHtml = finalHtml.replace('</body>', inlineScripts + '</body>');
    }
  } else {
    // Link mode - update JS paths to use correct base path
    if (assetBasePath) {
      finalHtml = finalHtml.replace(
        /<script[^>]*src=["'](assets\/scripts\/[^"']+)["']/gi,
        `<script type="text/javascript" src="${assetBasePath}/$1"`
      );
    }
  }
  
  return finalHtml;
} 

/**
 * Create a form for editing/adding content item
 * 
 * TODO: Refactor this file (create item functions, use more funcs etc')
 * TODO: Split to sub-functions
 * TODO: Support generic i18n
 * TODO: Show revisions
 * 
 */

export function contentItem ( contentType , ItemId ) {

  this.id = ItemId;
  this.type= contentType;
  this.isNew = ItemId == 'new';
  this.attachments = {};
  
  this.seo = {};

  // TODO: Dynamic languages 
  this.en = {};

  let appSettings = utils.getGlobalVariable('appSettings');
  const contentTypes = utils.getGlobalVariable('contentTypes') || [];
  let typeData = contentTypes.find ( ty => ty.name==contentType );
  
  if (!typeData) {
    // Store contentType for later error handling
    this._missingType = true;
    typeData = { urlPrefix: contentType + '/', fields: [] }; // Fallback
  }
 
  /* when item is new - prevent from changing it's id to existing one */
  let existsItemsIds = [];
  if ( this.isNew ) {
    let APIconnect = utils.getGlobalVariable('gitApi');
    APIconnect.getFile ('search/'+contentType+'.json')
              .then(response => {
                return JSON.parse(response)
              })
              .then( fileJson => {
                existsItemsIds = fileJson.map(i=>i.id);
              })
              .catch(error => {
                // Search file doesn't exist yet - that's OK for new items
                console.log('Search file does not exist yet:', 'search/'+contentType+'.json');
                existsItemsIds = [];
              });
  }
  

  this.validate = () => {
    let errors = {};
    if( ['','new'].indexOf(this.id) > -1 )  {
      errors.id = 'Id is required';
    }

    if( existsItemsIds.indexOf(this.id) > -1 ) {
      errors.id = 'This Id already exists';
    }

    if( !this.title ) {
      errors.title = 'Title is required';
    }

    return errors;
  }

  this.render = ( language ) => {
    let output = '';
    
    typeData.fields.forEach( f => { 
      let value = '';
      if( ['image','field'].indexOf(f.type) > -1 || f.i18n === false ) {
        value = this[f.name]
      }
      else {
        if ( language != '') {
          value = this[language][f.name];
        }
        else {
          value = this[f.name];
        }
      }
      output+= this.renderField( f, value , language );
    }); 
    return output;
  }

  this.renderField = ( fieldData, value , language ) => {
    
    if( value == '' || !value ) return '';

    let fieldContent = value;
    const effectiveBase = getEffectiveBasePath();
    const prefix = effectiveBase ? effectiveBase.replace(/\/$/,'') + '/' : '/';
    const normalizedPath = typeof value === 'string' ? value.replace(/^\/+/, '') : value;

    switch ( fieldData.type ) {
      case "image":
        if (/^https?:\/\//i.test(value)) {
          fieldContent = `<img src="${value}" />`;
        } else {
          fieldContent = `<img src="${prefix}${normalizedPath}" />`;
        }
      break;
      case "file":
        if (/^https?:\/\//i.test(value)) {
          fieldContent = `<a href="${value}" >` + utils.t('viewFile', language) + '</a>';
        } else {
          fieldContent = `<a href="${prefix}${normalizedPath}" >` + utils.t('viewFile', language) + '</a>';
        }
      break;
    }
    return `<div class='field field-${fieldData.type} f-${fieldData.name}'>${fieldContent}</div>`;
  }

  this.getURL = returnAbsolutePath => {
      const contentTypes = utils.getGlobalVariable('contentTypes') || [];
      const currentTypeData = contentTypes.find(ty => ty.name === this.type) || typeData;
      if (!currentTypeData) {
        throw new Error(`Content type "${this.type}" not found`);
      }
      let url = (returnAbsolutePath ? '/' : '') + currentTypeData.urlPrefix + this.id;
      return decodeURIComponent(url);
  }

  this.setFile = ( field, value ) => {
    this.attachments[field] = value;
  }

  this.set = ( field, value , language ) => {
    if  ( language == null || language == '' ){
      this[field] = value;
    }  
    else {
      this[language][field] = value;
    }
    localStorage.setItem( this.type + '/' + this.id , JSON.stringify(this) );
  }

  /**
   * Render all files for this item
   */
  this.getRepositoryFiles = () => {
    /*** index.html ***/
    let appSettings = utils.getGlobalVariable('appSettings');
    return renderPage(this, appSettings.Lanugages)
            .then(files => {
              let itemToSave = JSON.parse(JSON.stringify(this));
              delete itemToSave.attachments;
              delete itemToSave.isNew;
              delete itemToSave.files;
              /*** index.json ***/
              return files.concat([{
                "content":  JSON.stringify(itemToSave),
                "filePath": this.getURL(false)+'/index.json',
                "encoding": "utf-8" 
              }]);
            })
            .catch(error => {
              // If renderPage fails (e.g., template fetch error), continue with just JSON
              console.warn('Failed to render page template, continuing with JSON only:', error.message);
              let itemToSave = JSON.parse(JSON.stringify(this));
              delete itemToSave.attachments;
              delete itemToSave.isNew;
              delete itemToSave.files;
              // Return just the JSON file if template rendering fails
              return [{
                "content":  JSON.stringify(itemToSave),
                "filePath": this.getURL(false)+'/index.json',
                "encoding": "utf-8" 
              }];
            })
            /*** Add Attachments ***/
            .then( files => {
              if ( this.attachments.length == 0 )  return files;
              let attachments = Object.keys(this.attachments).map( fieldName => ({
                  "content":  this.attachments[fieldName],
                  "filePath": this[fieldName],
                  "encoding": "base64" 
              }));
              return files.concat(attachments);
            })
  }
  
  /**
   * Render all files for deleted item 404
   */
  this.get404ItemFiles = () => {
    this.title = 'Page does not exists';
    /*** index.html ***/
    return renderPage( this, ['', 'en'], true )
    .then(files => {
      /*** index.json ***/
      return files.concat([{
        "content":  '',
        "filePath": this.getURL(false)+'/index.json',
        "encoding": "utf-8" 
      }]);
    })
  }

  /**
   * Render index pages using html templates
   * @param languages 
   */
  let renderPage = async function( editItemObj, languages , isDeleted ) {

    let translations = utils.getGlobalVariable('translations');
    let appSettings = utils.getGlobalVariable('appSettings');
    let APIconnect = utils.getGlobalVariable('gitApi');
 
    // Try local fetch first, then fallback to GitHub API
    // Use relative path (relative to cms-core/ directory where index.html is)
    return fetch('templates/base.html')
            .then(result => {
              if (result.ok) {
                return result.text();
              }
              throw new Error(`HTTP ${result.status}: ${result.statusText}`);
            })
            .catch(error => {
              // Log the error for debugging
              console.log('Local template fetch failed, trying GitHub API:', error.message);
              // Fallback to GitHub API
              return APIconnect.getFile('cms-core/templates/base.html')
                .catch(apiError => {
                  console.error('Both local and GitHub API fetch failed:', apiError);
                  throw new Error('Failed to load base template from both local server and GitHub API');
                });
            })
            .then( baseTemplate => {
              // TODO: Support multiple menus
              // Try local fetch first, then GitHub API
              const basePath = getBasePath();
              return fetch(`${basePath}/cms-core/menus/main.json`)
                                .then(response => {
                                  if (response.ok) {
                                    return response.json();
                                  }
                                  // Fall back to GitHub API (remove leading slash)
                                  return APIconnect.getFile('cms-core/menus/main.json')
                                    .then( menu => JSON.parse(menu) );
                                })
                                .catch(() => {
                                  // Final fallback to GitHub API
                                  return APIconnect.getFile('cms-core/menus/main.json')
                                    .then( menu => JSON.parse(menu) );
                                })
                                .then( jsonMenu => {
                const basePath = getBasePath();
                return Promise.all( languages.map( language => {

                  let menuHtml  = renderMenu( jsonMenu[language] );

                  let strings = {};        
                  translations.forEach(item => strings[item.key] = item.t[language] );
                  let isDefaultLanguage = (language == '') || (language == appSettings.Default_Language);
                  let pageDescription = editItemObj.seo.description ? editItemObj.seo.description : strings.SEODefaultDescription;
                  
                  let templateVars = {
                      'strings': strings,
                      'menu_main': menuHtml,
                      'direction':'rtl',
                      'linksPrefix':  isDefaultLanguage ? '' : (language+'/'),
                      'pageTitle': isDefaultLanguage ? editItemObj.title: editItemObj[language].title,
                      'pageDescription':pageDescription,
                      'pageClass': 'itemPage '+ editItemObj.type + ' ' + editItemObj.type + editItemObj.id
                  } ;

                  if ( !isDeleted ) {
                    templateVars.content = editItemObj.render( isDefaultLanguage ? '' : language );
                  }
                  else {
                    templateVars.pageTitle = 'Page not found';
                    templateVars.content = '';
                  }
                  
                  // Render template
                  let htmlContent = new Function("return `" + baseTemplate + "`;").call(templateVars);
                  
                  // Inline CSS and JS assets
                  return inlineAssets(htmlContent, basePath).then(inlinedHtml => {
                    return {
                      "content": inlinedHtml,
                      "filePath": ( isDefaultLanguage ? '': language+'/' )+editItemObj.getURL(false)+'/index.html',
                      "encoding": "utf-8" 
                    };
                  });
                }));
              })
            }) 
  }
}

/**
 * Load content and return promiss for onload 
 * 
 * @param contentType 
 * @param ItemId 
 */
export async function contentItemLoader ( contentType , ItemId ) {
  
  let contentObject =  new contentItem( contentType , ItemId );

  // Get content type data description and load defaults
  const contentTypes = utils.getGlobalVariable('contentTypes') || [];
  let typeData = contentTypes.find ( ty => ty.name==contentType );
  
  if (!typeData) {
    throw new Error(`Content type "${contentType}" not found. Please create it in Content Types first.`);
  }
  
  if (typeData.fields && Array.isArray(typeData.fields)) {
    typeData.fields.forEach(field => {
      if ( field.defaultValue ) {
        contentObject[field.name] = field.defaultValue ;
      }
      else {
        contentObject[field.name] = '';
      }
    });
  }
  
  if( localStorage[ contentObject.type + '/' + contentObject.id ] ) { // item is in editing process
    let cachedData = JSON.parse(localStorage[ contentObject.type + '/' + contentObject.id ]);
    Object.keys(cachedData).forEach(field =>{
      contentObject[field] = cachedData[field];
    });
    return contentObject;   
  }
  else if (contentObject.isNew) {
    // For new items, don't try to fetch from API - just return with defaults
    return Promise.resolve(contentObject);
  }
  else {
    // load item details for existing items
    let APIconnect = utils.getGlobalVariable('gitApi');
    return APIconnect.getFile (contentObject.getURL(false)+'/index.json')
            .then( res => { return JSON.parse(res) })
            .then( loadedItemDetails => {
                // init to the default value
                Object.keys(loadedItemDetails).forEach(field =>{
                  contentObject[field] = loadedItemDetails[field];
                });
                return contentObject;       
            })
            .catch(err=> {
              // If file doesn't exist, return object with defaults
              console.log('Content file does not exist, using defaults:', contentObject.getURL(false)+'/index.json');
              return contentObject
            });
  }
}

/**
   * Render HTML menu from JSON
   */
  export function renderMenu( jsonMenu, basePath = '' ) {
    let menuHtml = '';
    if( jsonMenu ) {
      menuHtml = `<ul class='navbar-nav'>`;
      jsonMenu.forEach( menuItem => {
          const url = menuItem.url || '';
          const fullUrl = basePath ? `${basePath}/${url}` : (url ? `/${url}` : '/');
          
          if ( menuItem.subItems ) { 
            menuHtml += `<li class='nav-item dropdown'>
              <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown${menuItem.label.replace(/\s+/g, '')}" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">${ menuItem.label }</a>
              <div class="dropdown-menu" aria-labelledby="navbarDropdown${menuItem.label.replace(/\s+/g, '')}">
                  ${ menuItem.subItems
                      .map( menuSubItem => {
                        const subUrl = menuSubItem.url || '';
                        const subFullUrl = basePath ? `${basePath}/${subUrl}` : (subUrl ? `/${subUrl}` : '/');
                        return `<a class="dropdown-item" href="${subFullUrl}">${ menuSubItem.label }</a>`;
                      })
                      .join('') }
              </div>
            </li>\n`;
          }
          else { 
            menuHtml += `<li class="nav-item"><a class="nav-link" href="${fullUrl}">${ menuItem.label }</a></li>\n`;
          }
      });
      
      menuHtml += `</ul>`;
    }
    return menuHtml;
  }

/**
 * 
 * Render item edit form
 * 
 * @param parentElement - the element that the form will be appended to
 * @param contentType - type of content item
 * @param requestedItemId - item's Id
 * @param op - Operation (edit/sso/languagecode etc')
 */
export function contentItemForm ( contentType , editedItem , op ) {
  let wrapper = document.createElement('div');
  
  const contentTypes = utils.getGlobalVariable('contentTypes') || [];
  let typeData = contentTypes.find ( ty => ty.name==contentType );
  
  if (!typeData) {
    wrapper.innerHTML = `
      <div class="alert alert-danger">
        <h3>Content Type Not Found</h3>
        <p>The content type "<strong>${contentType}</strong>" does not exist.</p>
        <p>Please create it first in <a href="#content-types">Content Types</a>.</p>
        <a href="#content-types" class="btn btn-primary">Go to Content Types</a>
      </div>
    `;
    return wrapper;
  }
  
  // Set Fields By OP type
  let formFields =  JSON.parse(JSON.stringify(typeData.fields || []));

  // Build node tabs
  let baseURL = '#' + contentType + '/' + editedItem.id + '/';
  let links = [{ 'op':'edit', 'label':'Edit' }];
  if ( true ) { // TODO: check i18n support
    links.push({ 'op':'en', 'label':'Translate' });
  }
  links.push({ 'op':'seo', 'label':'SEO' });
  
  switch ( op ) {
    case 'delete':
      wrapper.innerHTML = `
        <div class="alert alert-warning" style="max-width: 600px;">
          <h3 style="margin-top: 0;">⚠️ Delete Content Item</h3>
          <p>Are you sure you want to delete <strong>${editedItem.title || editedItem.id}</strong>?</p>
          <p class="text-muted">This action cannot be undone.</p>
          <div style="margin-top: 20px;">
            <button id='approveDelete' class="btn btn-danger">Yes, Delete</button>
            <button class="btn btn-secondary" onclick="location.href='#${ contentType }/all'" style="margin-left: 10px;">Cancel</button>
          </div>
        </div>`;
        wrapper.querySelector('#approveDelete').onclick = (event) => {
          editedItem.get404ItemFiles()
          /*** Update Searchable List ***/ 
          .then( files => {
            return getUpdatedSearchFile('search/'+contentType+'.json', true).then( searchFiles => {
              return  files.concat(searchFiles);
            })
            .catch(error => {
              // If search file update fails, continue with just the delete files
              console.warn('Failed to update search file during delete, continuing:', error);
              return files;
            });
          })
          .then(files => {
            return commitFiles('Delete '+ contentType +': ' + editedItem.id , files )
            .then(res => {
              utils.successMessage('Item deleted successfully');
              utils.gotoList( contentType );
              return res;
            })
            .catch(error => {
              console.error('Error deleting item:', error);
              utils.errorHandler(error);
              throw error;
            });
          })
          .catch(error => {
            console.error('Error in delete process:', error);
            utils.errorHandler(error);
          });
        }
      break;
      case 'edit':
      case 'new':
      case 'en':  
      case 'seo':
        let dataObject = editedItem;
        
        switch( op ) {
          case 'edit':
            // Default fields 
            formFields.unshift({ name: "title", label: utils.str('admin_fieldTitleLabel'), type: "textfield"});
            formFields.unshift({ name: "id", label: ( editedItem.isNew ? utils.str('admin_fieldIdLabel'):utils.str('admin_fieldItemURL') ), type: "id"});
          break;
          case 'en':            
            formFields.unshift({ name: "title", label: utils.str('admin_fieldTitleLabel'), type: "textfield"});
            formFields = formFields
                          .filter( f=> ['image','file'].indexOf(f.type) == -1 )
                          .filter( f=> f.i18n !== false );
            dataObject = editedItem['en'];
          break;
          case 'seo':
            formFields = utils.getGlobalVariable('SEOFields');
            dataObject = editedItem['seo'];
          break;
        }

        wrapper.innerHTML = `
          <div style="margin-bottom: 25px;">
            <h1>Edit ${typeData.label}</h1>
            <p class="text-muted">Manage content item: <code>${editedItem.id}</code></p>
          </div>
          <ul id="tabs" class="nav nav-tabs">
            ${ links.map(field=>
              `<li class="nav-item">
                <a class="nav-link ${ field.op==op ? 'active' : '' }" href='${baseURL+field.op}'>${field.label}</a>
              </li>`).join('') }
          </ul>`;
        
        // validate before change tabs
        wrapper.querySelectorAll('#tabs li>a').forEach( tabLink => {
          tabLink.onclick = event=>{
            let errors = editedItem.validate();
            showErrors(errors);
            return Object.keys(errors).length == 0;
          }
        });

        let form = document.createElement('form');
        
        wrapper.appendChild(form);
        formFields.forEach( function(field) {
          let fieldDiv = document.createElement('div');
          let inputField;
          fieldDiv.classList.add('form-element');
          fieldDiv.classList.add(field.type);
          fieldDiv.id = 'formField_'+field.name;  
          form.appendChild(fieldDiv);
              
          fieldDiv.innerHTML = `<label>${ field.label }</label>`;

          switch(field.type){
            case 'id':             
              inputField = document.createElement('input');
              inputField.value = editedItem.id;
              inputField.onkeyup = v => {
                  urlPreview.innerText =  editedItem.getURL(true);
              };
              fieldDiv.appendChild(inputField);
             
              if ( !editedItem.isNew ) {
                inputField.style.display = 'none';
              }

              let urlPreview = document.createElement('span');
              urlPreview.className = 'siteUrlPreview'
              urlPreview.innerText =  editedItem.getURL(true);
              fieldDiv.appendChild(urlPreview);
            break;
            case 'date':
            case 'url':
              inputField = document.createElement('input');
              inputField.value = dataObject[field.name];
              inputField.type = field.type;
              fieldDiv.appendChild(inputField);
            break;
            case 'select':
              inputField = document.createElement('select');
              inputField.value = dataObject[field.name];
              Object.keys(field.values).forEach(valueKey=>{
                inputField.innerHTML += `<option value='${valueKey}'>${field.values[valueKey]}</option>`;
              })
              fieldDiv.appendChild(inputField);
            break;
            case 'wysiwyg':
            case 'textfield':
              inputField = document.createElement('textarea');
              inputField.id='formitem_'+ field.name;
              inputField.name= field.name;
              inputField.className = field.type=='wysiwyg'?'wysiwyg_element':'';
              inputField.placeholder= field.placeholder;
              inputField.value = dataObject[field.name] ? dataObject[field.name] : '';
              fieldDiv.appendChild(inputField);
            break;
            case 'image':  
            case 'file':
              let filePath = decodeURIComponent(editedItem[field.name]);       
              if( field.type == 'image') {                  
                fieldDiv.innerHTML += `<div class='preview'>
                  ${ filePath ? `<img src="${ '../' + filePath +'?t'+ ((new Date()).getTime()) }" />` : '' }
                </div>`;
              }
              else {
                fieldDiv.innerHTML += `<div class='preview'>
                  ${ filePath }
                </div>`;
              }
            
              inputField = document.createElement('input');
              fieldDiv.appendChild(inputField);
              inputField.id='formitem_'+ field.name;
              inputField.name= field.name;
              inputField.type="file";
            break;
          }   
          let fieldError = document.createElement('span');
          fieldError.className = 'alert alert-danger';
          fieldError.style.display = 'none';
          fieldDiv.appendChild(fieldError);

          /** Handle fields change */
          inputField.onchange = function(event) {
            let language = '';
            if ( ['edit','sso'].indexOf( op ) == -1 ) { language = op; }
            switch(field.type){
              case 'wysiwyg':
              case 'textfield':
                let textValue = typeof event == 'string' ? event :  event.target.value;
                editedItem.set( field.name , textValue , language );
              break;
              case 'image':
              case 'file':
                editedItem.set( field.name , editedItem.getURL(false)+ '/'+field.name+'.'+this.files[0].name.split('.').pop(), '');
                var reader = new FileReader();               

                reader.onload = ( evt => {
                  var contents = reader.result;
                  editedItem.setFile(field.name ,contents.substr(contents.indexOf(',') + 1)); 

                  // preview image
                  let image = document.createElement("img");
                  image.src = contents;
                  image.setAttribute('style','max-width:200px;max-heigth:200px;'); 
                  
                  let previewElement = wrapper.querySelector('.preview');
                  previewElement.innerHTML = '';
                  if ( field.type == 'image' ) {
                    previewElement.appendChild(image);
                  }
                  else {
                    previewElement.innerHTML = this.files[0].name;
                  }
                });
                
                reader.readAsDataURL(this.files[0]);
              break;
              case 'id':                
                editedItem.isNew = false;
                editedItem.set(field.name, inputField.value , '');
              break;
              default: 
                editedItem.set(field.name, inputField.value , language);
              break;
            }

            // revalidate field
            let errors = editedItem.validate();
            showErrors(errors , field.name );
            
            //Change hash to item URL
            if ( !errors.id ) {
              location.hash = '#' + editedItem.type + '/'+ editedItem.id;
            }
          }
        });
              
        
       
        let submitButtons = document.createElement('div');
        let cancelButton = document.createElement('button');
        cancelButton.innerText = 'Cancel';
        cancelButton.className = 'cancel';
        cancelButton.onclick = ( ()=> {
          if( confirm('Are you sure?') ) {
            localStorage.removeItem(editedItem.type+'/' + editedItem.id);
            utils.gotoList(editedItem.type);
          }
        });
        let submitButton = document.createElement('button');
        submitButton.className = 'submit';
        submitButton.innerText = 'save';

        /**
         * Submit item
         */
        submitButton.onclick = function() {
          let formErrors = editedItem.validate();
          if ( Object.keys(formErrors).length > 0 ) {
              Object.keys(formErrors).forEach(errorField=>{
                let errorContainer = document.querySelector('#formField_'+errorField+' .alert');
                errorContainer.innerHTML = formErrors[errorField];
                errorContainer.style.display = 'block';
              })
            return;
          }

          editedItem.getRepositoryFiles()
          /*** Update Searchable List ***/ 
          .then( files => {
            console.log('Repository files prepared:', files.length, 'files');
            if (!files || files.length === 0) {
              throw new Error('No files to save. Please check that the content item has valid data.');
            }
            return getUpdatedSearchFile('search/'+contentType+'.json').then( searchFiles => {
              const allFiles = files.concat(searchFiles);
              console.log('Total files to commit:', allFiles.length, '(content:', files.length, ', search:', searchFiles.length, ')');
              return allFiles;
            })
            .catch(error => {
              // If search file update fails, continue with just the content files
              console.warn('Failed to update search file, continuing with save:', error);
              return files;
            });
          })
          .then(files => {
            if (!files || files.length === 0) {
              throw new Error('No files to commit');
            }
            console.log('Committing', files.length, 'files...');
            return commitFiles('Save '+ contentType +': ' + editedItem.id , files )
            .then(res => {
              // Verify commit actually succeeded - must have sha
              if (res && res.sha && !res.error) {
                console.log('Commit verified - SHA:', res.sha);
                localStorage.removeItem( editedItem.type+'/' + editedItem.id );
                localStorage.removeItem( editedItem.type+'/new' );
                utils.successMessage('Item saved successfully');
                utils.gotoList( contentType );
                return res;
              } else {
                console.error('Commit verification failed:', res);
                throw new Error(res?.error || res?.message || 'Commit failed - invalid response');
              }
            })
            .catch(error => {
              console.error('Error saving item:', error);
              // Show error message to user
              const errorMsg = error?.message || error?.error || 'Failed to save item. Please check console for details.';
              utils.errorHandler(error);
              // Don't redirect - let user fix and try again
              return Promise.reject(error);
            });
          })
          .catch(error => {
            console.error('Error in save process:', error);
            // Error already handled in inner catch, just log here
          })         
        }

        submitButtons.appendChild(submitButton);
        submitButtons.appendChild(cancelButton);      
        form.appendChild(submitButtons);

        form.onsubmit = function(event){
          submitButtons.disabled = true; 
          event.preventDefault();
        }

        // Show message on all fields if validateField is null
        // or on single field id validateField is specified 
        let showErrors = (errorsObject, validateField) =>{
          formFields.filter( f=> !validateField || f.name == validateField)
            .forEach( function(field) {
              if( Object.keys(errorsObject).indexOf(field.name) == -1 ) {
                document.querySelector('#formField_'+field.name+' .alert').style.display = 'none';
              }
              else {
                document.querySelector('#formField_'+field.name+' .alert').innerHTML = errorsObject[field.name];
                document.querySelector('#formField_'+field.name+' .alert').style.display = 'block';
              }
            });
        };
      break;
      case 'rebuild':
        return getRepositoryFiles();
      break;    
  }

  /**
   * 
   * @param {*} filePath 
   */
  let getUpdatedSearchFile = function ( filePath , isDeleted ) {
    let APIconnect = utils.getGlobalVariable('gitApi');
    // Use the filePath parameter, or construct from contentType if not provided
    const searchFilePath = filePath || ('search/'+contentType+'.json');
    // Remove leading slash - search file may not exist yet (that's OK)
    const normalizedPath = searchFilePath.replace(/^\/+/, '');
    
    return APIconnect
            .getFile(normalizedPath)
            .then(response => {
              return JSON.parse(response)
            })
            .catch(error => { 
              // Search file doesn't exist yet - that's fine, return empty array
              // This is normal for the first item of a content type
              console.log('Search file does not exist yet, will be created:', normalizedPath);
              return [];
            })
            .then( fileJson => {
              let currentItem = fileJson.find( fileItem=> fileItem.id== editedItem.id); 
              fileJson = fileJson.filter( fileItem=> fileItem.id != editedItem.id );

              if ( !isDeleted ) {
                var indexedItem = {'id': editedItem.id };
                
                if ( currentItem ) {
                  indexedItem = currentItem;
                }
                //TODO: Support languages

                indexedItem.title = editedItem.title;
                
                typeData.fields.forEach(fieldData=>{
                  if ( ['image', 'file'].indexOf(fieldData.type) > -1 ) {
                    // Skip these fields in search index
                  }
                  else if ( ['wysiwyg','textfield'].indexOf(fieldData.type) > -1 ) {
                    indexedItem[fieldData.name] = getCleanText( editedItem[fieldData.name] );
                  }
                  else {
                    indexedItem[fieldData.name] = editedItem[fieldData.name];
                  }
                });

                indexedItem.href = editedItem.getURL(false);

                fileJson.push(indexedItem);              
              }

              return [{
                "content": JSON.stringify(fileJson),
                "filePath": normalizedPath,
                "encoding": "utf-8"
              }];
            });
  }

  /**
   * Get Search string - map item words in order to support static search
   */
  let getCleanText = function(value) {
      return value;
  }

  return wrapper;
}


/**
 * invoke API 
 * Commit changes to the git repository
 */
export function commitFiles( commitMessage , files ) {
  console.log('commitFiles called:', { commitMessage, files });
  
  let APIconnect = utils.getGlobalVariable('gitApi');
  
  if (!APIconnect) {
    console.error('GitHub API not available');
    throw new Error('GitHub API not initialized. Please log in first.');
  }
  
  if (!APIconnect.commitChanges) {
    console.error('commitChanges method not available on gitApi');
    throw new Error('GitHub API commitChanges method not available');
  }
  
  console.log('Calling APIconnect.commitChanges...');
  return APIconnect.commitChanges( commitMessage, files);
}


/**
 * Display List of items (For the 'all' callback)
 * TODO: Add pager
 */
export function contentList( parentElement, contentType ) {
  let APIconnect = utils.getGlobalVariable('gitApi');
  const contentTypes = utils.getGlobalVariable('contentTypes') || [];
  let typeData = contentTypes.find(ty=>ty.name==contentType);
  
  if (!typeData) {
    parentElement.innerHTML = `
      <div class="alert alert-warning">
        <h3>Content Type Not Found</h3>
        <p>The content type "<strong>${contentType}</strong>" does not exist.</p>
        <p>Please create it first in <a href="#content-types">Content Types</a>.</p>
        <a href="#content-types" class="btn btn-primary">Go to Content Types</a>
      </div>
    `;
    return;
  }
  let pageTitle  =  typeData.labelPlural;
  
  // Try to load search file with retries (GitHub API may have propagation delay after commit)
  function loadSearchFileWithRetry(retries = 3, delay = 2000) {
    return APIconnect.getFile('search/'+contentType+'.json')
      .then(response => JSON.parse(response))
      .catch(exception => {
        // File might not exist yet or GitHub API hasn't propagated the commit yet
        console.log(`Search file not found (attempt ${4-retries}/3, may be timing issue after commit):`, exception);
        if (retries > 0) {
          // Retry after delay
          return new Promise((resolve) => {
            setTimeout(() => {
              loadSearchFileWithRetry(retries - 1, delay).then(resolve).catch(() => resolve([]));
            }, delay);
          });
        }
        // All retries failed, return empty array
        return [];
      });
  }
  
  return loadSearchFileWithRetry()
    .then(items=>{
      if(items.length==0) {
        // Show message that list is empty, not an error
        parentElement.innerHTML = `
          <div class="alert alert-info">
            <h3>No items found</h3>
            <p>This content type doesn't have any items yet.</p>
            <a href="#${contentType}/new" class="btn btn-primary">Create First Item</a>
          </div>
        `;
        return;
      }
      parentElement.innerHTML = `
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                      <h1>${pageTitle}</h1>
                      <a href="#${contentType}/new" class="btn btn-primary">
                        + Add New
                      </a>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 200px;">ID</th>
                          <th>Title</th>
                          <th style="width: 150px; text-align: center;">Actions</th>                                             
                        </tr>
                      </thead>
                      <tbody>
                        ${ items.reverse().map((item) => 
                          `<tr>
                            <td><code>${ decodeURIComponent(item.id) }</code></td>
                            <td><strong>${item.title || '(No title)'}</strong></td>
                            <td style="text-align: center;">                            
                              <a href="#${contentType}/${item.id}" class="btn btn-sm btn-primary">Edit</a>
                              <a href="#${contentType}/${item.id}/delete" class="btn btn-sm btn-danger" style="margin-left: 8px;">Delete</a>
                            </td>
                          </tr>` ).join("")}
                      </tbody>
                    </table>
                  </div>`;
      
    })
    .catch( exeption=>{
      parentElement.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h1>${pageTitle}</h1>
            <a href="#${contentType}/new" class="btn btn-primary">
              + Add New
            </a>
          </div>
          <div class="alert alert-info" style="text-align: center; padding: 40px;">
            <h3 style="margin: 0 0 10px 0;">No items yet</h3>
            <p style="margin: 0 0 20px 0;">Get started by creating your first ${typeData.label.toLowerCase()}.</p>
            <a href="#${contentType}/new" class="btn btn-primary">Create First Item</a>
          </div>
        </div>`;
    });
}
