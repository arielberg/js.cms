import * as utils from './utils.js'; 
import { commitFiles, contentItemForm, contentList , contentItemLoader} from './contentItem.mjs'; 
import { menuBuilder } from './menu.mjs'; 
import { rerenderer, rederCustomPages } from './rerender.mjs'; 
import {doLogin} from './login.mjs'; 


/**
 * Simplest router...
 * Create a page loading flow
 **/
let regexExpressions =  {};
let loadSteps = {};

export function routeToCall(){

  let hash = window.location.hash;
 
  switch(true) {
    /** Page loader - init variables **/
    case !utils.getGlobalVariable('appSettings'):
      utils.loadSystemFile( 'appSettings', './appSettings.json' , routeToCall );
    break;
    /** Page loader - init variables **/
    case !utils.getGlobalVariable('translations'):
      utils.loadSystemFile( 'translations', './translations.json' , translatePage );
    break;
    case !utils.getGlobalVariable('gitApi'):
      doLogin(document.getElementById('content'));
    break;
    case !utils.getGlobalVariable('SEOFields'):
      utils.loadSystemFile( 'SEOFields', './SEOFields.json' , routeToCall );
    break;
    case !loadSteps.messages: 
      utils.showMessage();
      loadSteps.messages = true;
      routeToCall();
    break;
    case !utils.getGlobalVariable('contentTypes'):
      utils.loadSystemFile( 'contentTypes', './contentTypes.json', function(){
        if( utils.getGlobalVariable('contentTypes').length > 0 ) {
          let contentTypesSingle = '(' + utils.getGlobalVariable('contentTypes').map(a=>a.name).join('|') +')';
          regexExpressions.itemManagment = new RegExp('#'+contentTypesSingle+'\\/([^\/]+)',"i");
          
          utils.getGlobalVariable('contentTypes').reverse().forEach(contentType => {
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
        }
        routeToCall();
      });
    break;
    /** Content Item management **/
    case regexExpressions.itemManagment.test(hash):
      hash = hash.replace('#','');
      let params = hash.split('/');
      let contentType = params.shift();

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
        document.getElementById('content').innerHTML = '';
        document.getElementById('content').appendChild( contentItemForm(contentType ,contentItem , op) );
      })
      // TODO: Change it to use generic hook system (support plugins)
      .then( response => {  
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
      });

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
      document.getElementById('content').innerHTML = '';   
    break;
  }
}

/** Translation interface for 'static' string in pages */
function translationInterface(parentElement) {
 
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
          "filePath": 'admin/translations.json',
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
  routeToCall();
}


window.onhashchange = function(){
  routeToCall();
};