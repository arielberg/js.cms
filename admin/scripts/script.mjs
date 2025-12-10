import * as utils from './utils.js'; 
import { commitFiles, contentItemForm, contentList , contentItemLoader} from './contentItem.mjs'; 
import { menuBuilder } from './menu.mjs'; 
import { rerenderer, rederCustomPages } from './rerender.mjs'; 
import {doLogin} from './login.mjs'; 
import { loadModules, mergeContentTypes } from '../../core/moduleLoader.mjs';
import { registerHooks, executeHook } from '../../core/hooks/hookSystem.mjs';
import { contentTypeManager } from './contentTypeManager.mjs';
import { ensureConfigured } from './configChecker.mjs';
import { initNavigation, updateActiveNav } from './navigation.mjs';


/**
 * Simplest router...
 * Create a page loading flow
 **/
let regexExpressions =  {};
let loadSteps = {};

export function routeToCall(){

  let hash = window.location.hash;
 
  switch(true) {
    /** Configuration check - redirect to setup if not configured **/
    case !loadSteps.configChecked:
      ensureConfigured().then(isConfigured => {
        if (!isConfigured) {
          // Redirect will happen, don't continue
          return;
        }
        loadSteps.configChecked = true;
        routeToCall();
      });
      return; // Exit early, will continue after redirect check
    break;
    /** Page loader - init variables **/
    case !utils.getGlobalVariable('appSettings'):
      utils.loadSystemFile( 'appSettings', '../config/appSettings.json' , routeToCall );
    break;
    /** Page loader - init variables **/
    case !utils.getGlobalVariable('translations'):
      utils.loadSystemFile( 'translations', '../config/translations.json' , translatePage );
    break;
    case !utils.getGlobalVariable('gitApi'):
      doLogin(document.getElementById('content'));
    break;
    case !utils.getGlobalVariable('SEOFields'):
      utils.loadSystemFile( 'SEOFields', '../config/SEOFields.json' , routeToCall );
    break;
    case !loadSteps.messages: 
      utils.showMessage();
      loadSteps.messages = true;
      routeToCall();
    break;
    case !utils.getGlobalVariable('modules'):
      // Load modules first
      loadModules()
        .then(modules => {
          utils.setGlobalVariable('modules', modules);
          
          // Register hooks from all modules
          const allHooks = {};
          modules.forEach(module => {
            if (module.hooks) {
              Object.keys(module.hooks).forEach(hookName => {
                if (!allHooks[hookName]) {
                  allHooks[hookName] = [];
                }
                allHooks[hookName].push({
                  module: module.name,
                  handler: module.hooks[hookName]
                });
              });
            }
          });
          registerHooks(allHooks);
          
          // Merge content types from modules
          const moduleContentTypes = mergeContentTypes(modules);
          
          // Load content types from config (primary source for dynamic types)
          utils.loadSystemFile( 'configContentTypes', '../config/contentTypes.json', function(){
            const configContentTypes = utils.getGlobalVariable('configContentTypes') || [];
            
            // Combine module content types with config content types
            // Config content types take precedence (for dynamic management)
            const allContentTypes = [...configContentTypes, ...moduleContentTypes];
            utils.setGlobalVariable('contentTypes', allContentTypes);
            
            // Continue with content type setup
            setupContentTypes();
          });
        })
        .catch(error => {
          console.error('Error loading modules:', error);
          // Fallback to config-only content types
          utils.loadSystemFile( 'contentTypes', '../config/contentTypes.json', setupContentTypes );
        });
    break;
    case !utils.getGlobalVariable('contentTypes'):
      // This should not happen if modules loaded correctly, but fallback
      utils.loadSystemFile( 'contentTypes', '../config/contentTypes.json', setupContentTypes );
    break;
    /** Content Item management **/
    case regexExpressions.itemManagment && regexExpressions.itemManagment.test(hash):
      hash = hash.replace('#','');
      let params = hash.split('/');
      let contentType = params.shift();

      // Check if content type exists
      const contentTypes = utils.getGlobalVariable('contentTypes') || [];
      const contentTypeExists = contentTypes.find(ct => ct.name === contentType);
      
      if (!contentTypeExists) {
        document.getElementById('content').innerHTML = `
          <div class="alert alert-warning">
            <h3>Content Type Not Found</h3>
            <p>The content type "<strong>${contentType}</strong>" does not exist.</p>
            <p>Please create it first in <a href="#content-types">Content Types</a>.</p>
            <a href="#content-types" class="btn btn-primary">Go to Content Types</a>
          </div>
        `;
        break;
      }

      // If List is requested
      if( params[0] == 'all') {
        contentList(document.getElementById('content'), contentType );
        return;
      }
      // Else if Item form is requested
      let id  = params.shift();
      let op = ( params.length > 0 )? params[0] : 'edit';
      
      /** Start form */
      contentItemLoader( contentType, id )
      .then(contentItem => {
        // Execute beforeRender hook
        return executeHook('beforeRender', contentItem, contentType);
      })
      .then(contentItem => {
        document.getElementById('content').innerHTML = '';
        document.getElementById('content').appendChild( contentItemForm(contentType ,contentItem , op) );
      })
      .catch(error => {
        document.getElementById('content').innerHTML = `
          <div class="alert alert-danger">
            <h3>Error Loading Content</h3>
            <p>${error.message || 'An error occurred while loading the content item.'}</p>
            <a href="#${contentType}/all" class="btn btn-secondary">Back to List</a>
            <a href="#content-types" class="btn btn-primary" style="margin-left: 10px;">Content Types</a>
          </div>
        `;
        console.error('Content item loading error:', error);
      })
      .then( response => {  
        if (response !== undefined) {
          Array.prototype.forEach.call( document.getElementsByClassName('wysiwyg_element') , function (wysiwyg) {
            var suneditor = SUNEDITOR.create( wysiwyg.id , {
              buttonList: [
                  ['undo', 'redo'],
                  ['align', 'horizontalRule', 'list', 'table', 'fontSize'],
                  ["link", "image", "video", "audio"]
              ],
            });
            suneditor.onChange =  wysiwyg.onchange;
          });        
        }
      });

    break;
    case '#content-types'==hash:
      contentTypeManager(document.getElementById('content'));
    break;
    case '#menu'==hash:
    case '#menus'==hash:
      menuBuilder(document.getElementById('content'));
    break;
    case '#rerender'==hash:
      rerenderer(document.getElementById('content'));
    break;
    case '#translate'==hash:
      translationInterface(document.getElementById('content'));
    break;
    case '#logout'==hash:
      localStorage.removeItem('token');
      localStorage.removeItem('secret');
      localStorage.removeItem('data');
      location = '';
    break;
    default:
      // Check if hash looks like a content item route (e.g., #post/new, #article/123)
      // This handles cases where no content types exist yet or the regex didn't match
      const hashMatch = hash.match(/^#([^\/]+)\/(.+)$/);
      if (hashMatch && hashMatch[1] && hashMatch[2]) {
        const contentType = hashMatch[1];
        const contentTypes = utils.getGlobalVariable('contentTypes') || [];
        const contentTypeExists = contentTypes.find(ct => ct.name === contentType);
        
        if (!contentTypeExists) {
          document.getElementById('content').innerHTML = `
            <div class="alert alert-warning">
              <h3>Content Type Not Found</h3>
              <p>The content type "<strong>${contentType}</strong>" does not exist.</p>
              <p>Please create it first in <a href="#content-types">Content Types</a>.</p>
              <a href="#content-types" class="btn btn-primary">Go to Content Types</a>
            </div>
          `;
        } else {
          // Content type exists but route didn't match - try to handle it
          document.getElementById('content').innerHTML = '';   
        }
      } else {
        document.getElementById('content').innerHTML = '';   
      }
    break;
  }
}

/**
 * Setup content types in the UI
 */
function setupContentTypes() {
  const contentTypes = utils.getGlobalVariable('contentTypes') || [];
  
  if( contentTypes.length > 0 ) {
    let contentTypesSingle = '(' + contentTypes.map(a=>a.name).join('|') +')';
    regexExpressions.itemManagment = new RegExp('#'+contentTypesSingle+'\\/([^\/]+)',"i");
    
    contentTypes.reverse().forEach(contentType => {
      document.getElementById('sidebarLinks').insertAdjacentHTML('afterbegin',  `
        <li id='${contentType.name}_type_menu' class='contentTypeLinks'>
          <h3>${contentType.labelPlural}</h3>
          <ul>
            <li>
              <a class="nav-link" href="#${contentType.name}/all">${ utils.str('admin_ViewAllLink') }</a>
            </li>
            <li>
              <a class="nav-link" href="#${contentType.name}/new">${ utils.str('admin_AddNewLink') }</a>
            </li>
          </ul>
        </li>
        <li><hr/></li>
      `);
    });
    
    // Update navigation after content types are added
    initNavigation();
    setTimeout(() => {
      if (typeof updateActiveNav === 'function') {
        updateActiveNav();
      }
    }, 100);
  } else {
    // No content types - ensure regex is not set so default case can handle routes
    regexExpressions.itemManagment = null;
  }
}

/** Translation interface for 'static' string in pages */
function translationInterface(parentElement) {
 
  let translations = utils.getGlobalVariable('translations');
  let appSettings = utils.getGlobalVariable('appSettings');
  
  let fields = translations.filter(translationItem=>translationItem.ui==1)
                           .map( translationItem => `
                              <h3>${ ( translationItem.description ? translationItem.description + ' - ' : '' ) + translationItem.key }</h3>
                              ${ appSettings.Lanugages.map(langkey=> `<div class='langItem ${langkey}'>
                                <label>${ appSettings.LanugageLabels[langkey] }</label>
                                <textarea id='${ translationItem.key + '_' + langkey }'>${ translationItem.t[langkey] }</textarea>
                              </div>`).join('') }                        
                            `).join('<hr/>');
  let submit = document.createElement('button');
  submit.innerText = 'Submit';
  submit.onclick = ()=>{
    translations.forEach(translationItem=>{
      
      if ( translationItem.ui != 1 ) return;

      // Load User Trnaslated String
      appSettings.Lanugages.forEach(langkey=> {
        translationItem.t[langkey] = document.getElementById(translationItem.key+'_'+langkey).value;
      });

    });

    // render pages
    rederCustomPages()
      .then( renderedFiles=> { renderedFiles.push( 
        {
          "content": JSON.stringify(translations),
          "filePath": 'cms-core/config/translations.json',
          "encoding": "utf-8" 
        });
        return renderedFiles;
      })
      .then( renderedFiles =>{     
        return commitFiles('Rerender pages after translation change' , renderedFiles );
      }).then(res=> {
        parentElement.innerHTML = 'Done!';
      });
  }

  parentElement.innerHTML = '<div id="translaitonInterface">'+fields+'</div>';
  parentElement.appendChild(submit);
  //translationItem.key + '_' + langkey
  
  translations.filter(translationItem => translationItem.wysiwyg ==1 )
              .forEach( translationItem => {               
                  appSettings.Lanugages.forEach(languageCode=>{
                    var suneditor = SUNEDITOR.create( translationItem.key+'_'+languageCode , {
                      buttonList: [
                          ['undo', 'redo'],
                          ['bold','link' ,'align', 'textStyle', 'formatBlock', 'horizontalRule', 'list', 'table' ]
                      ],
                      textStyles: [
                        {name: 'button1', style: 'background: #6ec1e4;padding: 25px 30px;border: none; color: #fff;font-size: 1.3em;border-radius: 10px;  cursor: pointer;', tag: 'a'}
                      ],
                      formats: [
                        "p",
                        "h4"
                      ],
                    });                   
                    
                    suneditor.onChange = function( htmlContent ) {                      
                      document.getElementById(translationItem.key+'_'+languageCode ).value = htmlContent;              
                    };
                  });                  
              });  

}

/* update page with translated strings */
function translatePage( items ) {
 
  let translations = utils.getGlobalVariable('translations');
  
  let language = utils.getAdminLanguage();
  document.querySelectorAll('[data-stringid]').forEach(element => {
    let stringId = element.getAttribute('data-stringid');
    let translationItem = translations.find( t=>t.key == stringId );
    if( translationItem && translationItem.t[language] ) {
      element.innerText = translationItem.t[language];
    }
  })
  routeToCall();
}

window.onload = function(e) { 
  initNavigation();
  routeToCall();
}


window.onhashchange = function(){
  updateActiveNav();
  routeToCall();
};
