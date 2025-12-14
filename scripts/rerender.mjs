import * as utils from './utils.js'; 
import { commitFiles, contentItemForm, contentList , contentItemLoader, renderMenu} from './contentItem.mjs'; 


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
    
    // Use relative path (relative to admin/ directory where index.html is)
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
                return Promise.all([
                        // Try local fetch first for menus
                        fetch('/cms-core/menus/main.json')
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
                        fetch('/config/customPages.json')
                            .then(response => {
                              if (response.ok) {
                                return response.json();
                              }
                              // Try cms-core defaults
                              return fetch('/cms-core/config/customPages.json')
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

                                            return ({
                                                "content":  new Function("return `" + pageWrapper + "`;").call(templateVars),
                                                "filePath": linksPrefix + templateData.url,
                                                "encoding": "utf-8" 
                                            })
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