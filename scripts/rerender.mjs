import * as utils from './utils.js'; 
import { commitFiles, contentItemForm, contentList , contentItemLoader, renderMenu} from './contentItem.mjs';

/**
 * Fetch CSS file content with multiple path fallbacks
 */
async function fetchCSS(filePath, basePath = '') {
  const pathsToTry = [];
  
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  pathsToTry.push(`/${filePath}`);
  pathsToTry.push(filePath);
  
  const APIconnect = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      continue;
    }
  }
  
  if (APIconnect && APIconnect.getFile) {
    try {
      return await APIconnect.getFile(filePath);
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for CSS ${filePath}:`, apiError);
    }
  }
  
  return null;
}

/**
 * Fetch JS file content with multiple path fallbacks
 */
async function fetchJS(filePath, basePath = '') {
  const pathsToTry = [];
  
  if (basePath) {
    pathsToTry.push(`${basePath}/${filePath}`);
  }
  pathsToTry.push(`/${filePath}`);
  pathsToTry.push(filePath);
  
  const APIconnect = utils.getGlobalVariable('gitApi');
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      continue;
    }
  }
  
  if (APIconnect && APIconnect.getFile) {
    try {
      return await APIconnect.getFile(filePath);
    } catch (apiError) {
      console.warn(`GitHub API fetch failed for JS ${filePath}:`, apiError);
    }
  }
  
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
    const cssFiles = ['assets/css/style.css', 'assets/css/bootstrap.min.css'];
    let inlineStyles = '';
    
    for (const cssFile of cssFiles) {
      try {
        const cssContent = await fetchCSS(cssFile, assetBasePath);
        if (cssContent) {
          inlineStyles += `<style>${cssContent}</style>\n`;
        }
      } catch (error) {
        console.warn(`Error loading CSS ${cssFile}:`, error);
      }
    }
    
    if (inlineStyles) {
      finalHtml = finalHtml.replace(/<link[^>]*href=["']?assets\/css\/[^"']+["']?[^>]*>/gi, '');
      finalHtml = finalHtml.replace('</head>', inlineStyles + '</head>');
    }
  } else {
    // Link mode - update CSS paths
    if (assetBasePath) {
      finalHtml = finalHtml.replace(
        /<link[^>]*href=["'](assets\/css\/[^"']+)["']/gi,
        `<link rel="stylesheet" type="text/css" href="${assetBasePath}/$1"`
      );
    }
  }
  
  // Handle JS
  if (jsMode === 'embed') {
    const jsFiles = ['assets/scripts/main.js'];
    let inlineScripts = '';
    
    for (const jsFile of jsFiles) {
      try {
        const jsContent = await fetchJS(jsFile, assetBasePath);
        if (jsContent) {
          inlineScripts += `<script type="text/javascript">${jsContent}</script>\n`;
        }
      } catch (error) {
        console.warn(`Error loading JS ${jsFile}:`, error);
      }
    }
    
    if (inlineScripts) {
      finalHtml = finalHtml.replace(/<script[^>]*src=["']?assets\/scripts\/[^"']+["']?[^>]*><\/script>/gi, '');
      finalHtml = finalHtml.replace('</body>', inlineScripts + '</body>');
    }
  } else {
    // Link mode - update JS paths
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
 * Get base path for GitHub Pages (e.g., /test2)
 */
function getBasePath() {
  const githubPagesMatch = window.location.href.match(/(.*)github\.io\/([^/]+)/);
  if (githubPagesMatch) {
    const currentPath = githubPagesMatch[0];
    return currentPath;
  }
  return  window.location.protocol+'//'+window.location.host;
} 


/**
 * Rerender page - support rerendering all content by time + rerendering of custom pages
 * 
 * @param parentComponent - the element of the page that should contian the rerendering dialog
 */
export function rerenderer( parentComponent ) {
    let typeData = utils.getGlobalVariable('contentTypes');
    let appSettings = utils.getGlobalVariable('appSettings');
    let APIconnect = utils.getGlobalVariable('gitApi');
    
    parentComponent.innerHTML = `Select the Object that will be Re-rendered
        <form id='rerenderForm'>
            <ul>
                ${ typeData.map( td => `<li><input type='checkbox' value='${td.name}' id='${td.name}' /><label for="${td.name}">${td.labelPlural}</label></li>`).join('') }
                <li><input type='checkbox' value='static' id='static' /><label for="static">Static Pages</label></li>
            </ul>
            <button id='rerenderBtn'>Submit</button>
        </form>
    `;
    let submitButton = document.getElementById('rerenderBtn');
    submitButton.onclick = (event => {
        submitButton.disabled = true;
        return Promise.all(
            typeData
                .filter( t =>  document.getElementById(t.name).checked )
                .map( t=> { 
                    return APIconnect.getFile('search/' + t.name + '.json')
                        .then(response=>{
                            return JSON.parse(response);
                        })
                        .then( searchItems=>{
                            return Promise.all(
                                searchItems
                                .map( searchItem => { 
                                    return contentItemLoader( t.name , searchItem.id)
                                        .then( fetchedItem => { 
                                            return fetchedItem.getRepositoryFiles() 
                                        })
                            })
                            )       
                        })
                })
        )

        // Flat the response promises to a list of objects
        .then( files =>{
            files = Array.prototype.concat.apply([], files );
            return Array.prototype.concat.apply([], files );
        })

        // Add custom pages files
        .then( files => {
            if( document.getElementById('static').checked ) {
                return rederCustomPages().then( customPages => {
                    return  files.concat( customPages );
                })            
            }
            else {
                return files;
            }
        })

        // Commit Files
        .then( files =>{
            return commitFiles('Rebuild Posts', files)
        })

        // Done - Reset UI
        .then(res=> {
            utils.successMessage('Content Has been Updated successfully', res);
            submitButton.disabled = false;
        });        
    });
    return;
}

/**
 * Static pages
 */
export function rederCustomPages() {

    let translations = utils.getGlobalVariable('translations');
    let appSettings = utils.getGlobalVariable('appSettings');
    let APIconnect = utils.getGlobalVariable('gitApi');
    
    let languages = appSettings.Lanugages;
    
    // Use relative path (relative to cms-core/ directory where index.html is)
    let wrapperPath = 'templates/base.html';
   
    return fetch( wrapperPath )
            .then( res => {
              if (res.ok) {
                return res.text();
              }
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            })
            .catch(error => {
              // Log the error for debugging
              console.log('Local template fetch failed, trying GitHub API:', error.message);
              // Fallback to GitHub API
              const APIconnect = utils.getGlobalVariable('gitApi');
              return APIconnect.getFile('cms-core/templates/base.html')
                .catch(apiError => {
                  console.error('Both local and GitHub API fetch failed:', apiError);
                  throw new Error('Failed to load base template from both local server and GitHub API');
                });
            })
            .then( pageWrapper => {
                const basePath = getBasePath();
                return Promise.all([
                        // Try local fetch first for menus
                        fetch(`${basePath}/cms-core/menus/main.json`)
                            .then(response => {
                              if (response.ok) {
                                return response.json();
                              }
                              // Fall back to GitHub API (remove leading slash)
                              return APIconnect.getFile('cms-core/menus/main.json')
                                .then( menu => JSON.parse(menu) );
                            })
                            .catch(() => {
                              return APIconnect.getFile('cms-core/menus/main.json')
                                .then( menu => JSON.parse(menu) );
                            }),
                        // Try local fetch first for customPages
                        fetch(`${basePath}/config/customPages.json`)
                            .then(response => {
                              if (response.ok) {
                                return response.json();
                              }
                              // Try cms-core defaults
                              return fetch(`${basePath}/cms-core/config/customPages.json`)
                                .then(response => {
                                  if (response.ok) {
                                    return response.json();
                                  }
                                  // Fall back to GitHub API
                                  return APIconnect.getFile('config/customPages.json')
                                    .then( customPages => JSON.parse(customPages) );
                                });
                            })
                            .catch(() => {
                              return APIconnect.getFile('config/customPages.json')
                                .then( customPages => JSON.parse(customPages) );
                            })
                    ])
                    .then( promises => {
                        let jsonMenu = promises[0];
                        let jsonCustomPageList = promises[1];
                        console.log(jsonCustomPageList);
                        return languages.map(languageCode=>{
                            let linksPrefix = languageCode == appSettings.Default_Language ? '': (languageCode+'/');

                            let menuHtml = renderMenu(jsonMenu[languageCode]);
                            
                            let templates = jsonCustomPageList[languageCode];

                            let strings = {};        
                            translations.forEach( item => strings[item.key] = item.t[languageCode] );
                            
                            let templateVars = {
                                'strings': strings,
                                'menu_main': menuHtml,
                                'direction':'rtl',
                                'linksPrefix': linksPrefix
                            };

                            return Promise.all(
                                templates.map( templateData => {
                                return fetch('templates/customPages/' + templateData.template )
                                        .then( res => res.text() )
                                        .then( template => 
                                        {  
                                            templateVars.pageClass = templateData.class;
                                            templateVars.pageTitle = templateData.title;
                                            templateVars.content = new Function("return `" + template + "`;").call(templateVars); 

                                            // Render template
                                            let htmlContent = new Function("return `" + pageWrapper + "`;").call(templateVars);
                                            
                                            // Inline CSS and JS assets
                                            return inlineAssets(htmlContent, basePath).then(inlinedHtml => {
                                                return {
                                                    "content": inlinedHtml,
                                                    "filePath": linksPrefix + templateData.url,
                                                    "encoding": "utf-8" 
                                                };
                                            });
                                        })
                                })
                            )   
                    })     
                })
            })
            .then( filesResponses => Promise.all(filesResponses))
            .then( filesResponses =>{ 
                return filesResponses.reduce((filesResponses, val) => filesResponses.concat(val), []);
            })
}