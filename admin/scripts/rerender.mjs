import * as utils from './utils.js'; 
import { commitFiles, contentItemForm, contentList , contentItemLoader} from './contentItem.mjs'; 


/**
 * Rerender page - support rerendering all content by time + rerendering of custom pages
 * 
 * @param parentComponent - the element of the page that should contian the rerendering dialog
 */
export function rerenderer( parentComponent ) {
    let typeData = utils.getGlobalVariable('contentTypes');
    let appSettings = utils.getGlobalVariable('appSettings');
    let siteUrl = appSettings['Site_Url'];
    let APIconnect = utils.getGlobalVariable('gitApi');
    
    parentComponent.innerHTML = `Select the Object that will be Re-rendered
        <form id='rerenderForm'>
            <ul>
                ${ typeData.map(td=> `<li><input type='checkbox' value='${td.name}' id='${td.name}' /><label for="${td.name}">${td.labelPlural}</label></li>`).join('') }
                <li><input type='checkbox' value='static' id='static' /><label for="static">Static Pages</label></li>
            </ul>
            <button id='rerenderBtn'>Submit</button>
        </form>
    `;
    let submitButton = document.getElementById('rerenderBtn');
    submitButton.onclick = (event => {
        submitButton.disabled = true;
        typeData.forEach( t=> {
            if( !document.getElementById(t.name).checked ) return;
            APIconnect.getFile('/search/' + t.name + '.json')
                        .then(response=>{
                            return JSON.parse(response);
                        })
                        .then( searchItems=>{
                            return Promise.all(
                                searchItems
                                .map( searchItem => { 
                                    return contentItemLoader('post', searchItem.id)
                                            .then( fetchedItem => fetchedItem.getRepositoryFiles() )
                                })
                            )       
                        })
                        .then( files =>{
                            files = [].concat.apply([], files);
                            
                        })
                        .then( files =>{
                            return files.concat( rederCustomPages() );
                        })
                        .then( files =>{
                            console.log(files);
                            commitFiles('Rebuild Posts', files)
                        })
                        .then(res=> {
                            utils.successMessage('Content Has been Updated successfully', res);
                            submitButton.disabled = false;
                        });  
        });        
    });
    return;
}

/**
 * Static pages are
 */
export function rederCustomPages() {

    let translations = utils.getGlobalVariable('translations');
    let appSettings = utils.getGlobalVariable('appSettings');
    
    let languages = appSettings.Lanugages;
    
    let wrapperPath = 'templates/base.html';
    console.log('aaaaaaaaaaaaaa');
    fetch( wrapperPath )
      .then( res => res.text() )
      .then( pageWrapper => {

        return languages.map(languageCode=>{
          let linksPrefix = languageCode + (languageCode==''?'':'/');
          let templates = [
            { 
              template:'front.page.html',
              target:'index.html',
              title:'frontPageTitle',
              class:'frontPage'
            },
            { 
              template:'about.page.html',
              target:'about/index.html',
              title:'aboutUsPageTitle',
              class:'AboutUs'
            },
            { 
              template:'news.page.html',
              target:'in-the-news/index.html',
              title:'newsPageTitle',
              class:'news'
            },
            { 
              template:'papers.page.html',
              target:'position-papers/index.html',
              title:'papersPageTitle',
              class:'papers'
            },
            { 
              template:'articles.page.html',
              target:'posts/index.html',
              title:'articlesPageTitle',
              class:'articles'
            },
            { 
              template:'media.page.html',
              target:'media/index.html',
              title:'mediaPageTitle',
              class:'media'
            },
            { 
              template:'contact.page.html',
              target:'contact-us/index.html',
              title:'contactPageTitle',
              class:'contact'
            },
            { 
              template:'donations.page.html',
              target:'donations/index.html',
              title:'donationsPageTitle',
              class:'donations'
            }
          ];

          let strings = {};        
          translations.forEach(item => strings[item.key] = item.t[languageCode] );
         
          let templateVars = {
              'strings': strings,
              'site_url': appSettings['Site_Url'],
              'direction':'rtl',
              'linksPrefix': linksPrefix
          };

          return Promise.all(
            templates.map( templateData => {
              return fetch('templates/' + templateData.template )
                    .then( res => res.text() )
                    .then( template => 
                      {  
                        templateVars.pageClass = templateData.class;
                        templateVars.pageTitle = strings[templateData.title];
                        templateVars.content = new Function("return `" + template + "`;").call(templateVars); 

                        return ({
                          "content":  new Function("return `" + pageWrapper + "`;").call(templateVars),
                          "filePath": linksPrefix + templateData.target,
                          "encoding": "utf-8" 
                        })
                      })
            })
          )        
        })
      })
      .then( filesResponses => Promise.all(filesResponses))
      .then( filesResponses =>{ 
        return filesResponses.reduce((filesResponses, val) => filesResponses.concat(val), []);
      })
      .then( renderedFiles=> { renderedFiles.push( 
        {
          "content": JSON.stringify(translations),
          "filePath": 'admin/translations.json',
          "encoding": "utf-8" 
        });
        return renderedFiles;
      })
}