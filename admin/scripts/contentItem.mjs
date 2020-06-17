import * as utils from './utils.js'; 

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
  let siteUrl = appSettings['Site_Url'];
  let typeData = utils.getGlobalVariable('contentTypes').find ( ty => ty.name==contentType );
 
  /* when item is new - prevent from changing it's id to existing one */
  let existsItemsIds = [];
  if ( this.isNew ) {
    let APIconnect = utils.getGlobalVariable('gitApi');
    APIconnect.getFile ('/search/'+contentType+'.json')
              .then(response => {
                return JSON.parse(response)
              })
              .then( fileJson => {
                existsItemsIds = fileJson.map(i=>i.id);
              });
  }
  

  this.validate = () => {
    let errors = {};
    if( ['','new'].indexOf(this.id) > -1 )  {
      errors.id = 'Id is required';
    }

    if( existsItemsIds.indexOf(this.id) > -1 ) {
      errors.id = 'This Id allready exists';
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
    let fieldContent = value;
    switch ( fieldData.type ) {
      case "image":
        fieldContent = '<img src="'+value+'" />';
      break;
      case "file":
        fieldContent = '<a href="'+value+'" >' + utils.t('viewFile', language) + '</a>';
      break;
    }
    return `<div class='field field-${fieldData.type} f-${fieldData.name}'>${fieldContent}</div>`;
  }

  this.getURL = returnAbsolutePath => {
      return ( returnAbsolutePath ? siteUrl: '' ) + typeData.urlPrefix + this.id;
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
    // TODO: Take laguages from settings...
    return renderPage(this, ['', 'en'])
    .then(files => {
      let itemToSave = JSON.parse(JSON.stringify(this));
      delete itemToSave.attachments;
      /*** index.json ***/
      return files.concat([{
        "content":  JSON.stringify(itemToSave),
        "filePath": this.getURL(false)+'/index.json',
        "encoding": "utf-8" 
      }]);
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
       
    return fetch('templates/base.html')
            .then(result=> result.text())
            .then( baseTemplate => {
              return Promise.all( languages.map( language => {

                let strings = {};        
                translations.forEach(item => strings[item.key] = item.t[language==''?'he':language] );

                let templateVars = {
                    'strings': strings,
                    'site_url':siteUrl,
                    'direction':'rtl',
                    'linksPrefix':  language + (language==''?'':'/'),
                    'pageTitle': language=='' ? editItemObj.title: editItemObj[language].title,
                    'pageClass': 'itemPage '+ editItemObj.type
                } ;
                if ( !isDeleted ) {
                  templateVars.content = editItemObj.render(language);
                }
                else {
                  templateVars.pageTitle = 'Page not found';
                  templateVars.content = '';
                }
                
                return {
                  "content":  new Function("return `" + baseTemplate + "`;").call(templateVars),
                  "filePath": (language!=''?language+'/':'')+editItemObj.getURL(false)+'/index.html',
                  "encoding": "utf-8" 
                }
              }));
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
  let typeData = utils.getGlobalVariable('contentTypes').find ( ty => ty.name==contentType );
  
  typeData.fields.forEach(field => {
    if ( field.defaultValue ) {
      contentObject[field.name] = field.defaultValue ;
    }
    else {
      contentObject[field.name] = '';
    }
  });
  
  if( localStorage[ contentObject.type + '/' + contentObject.id ] ) { // item is in editing process
    let cachedData = JSON.parse(localStorage[ contentObject.type + '/' + contentObject.id ]);
    Object.keys(cachedData).forEach(field =>{
      contentObject[field] = cachedData[field];
    });
    return contentObject;   
  }
  else {
    // load item details
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
              return contentObject
            });
  }
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
  
  let appSettings = utils.getGlobalVariable('appSettings');
  let siteUrl = appSettings['Site_Url'];

  let typeData = utils.getGlobalVariable('contentTypes').find ( ty => ty.name==contentType );
  // Set Fields By OP type
  let formFields =  JSON.parse(JSON.stringify(typeData.fields));

  // Build node tabs
  let baseURL = '#' + contentType + '/' + editedItem.id + '/';
  let links = [{ 'op':'edit', 'label':'עריכה' }];
  if ( true ) { // TODO: check i18n support
    links.push({ 'op':'en', 'label':'תרגום' });
  }
  links.push({ 'op':'seo', 'label':'SEO' });
  
  switch ( op ) {
    case 'delete':
      wrapper.innerHTML = `
        <div>
          <h3>האם אתה בטוח שברצונך למחוק פריט זה?</h3>
          <div>
            <button id='approveDelete'>כן</button>
            <button className='cancel' onclick="location.href='#${ contentType }/all'">לא</button>
          </div>
        </div>`;
        wrapper.querySelector('#approveDelete').onclick = (event) => {
          editedItem.get404ItemFiles()
          /*** Update Searchable List ***/ 
          .then( files => {
            return getUpdatedSearchFile('search/'+contentType+'.json', true).then( searchFiles => {
              return  files.concat(searchFiles);
            })
          })
          .then(files => {
            commitFiles('Delete '+ contentType +': ' + editedItem.id , files )
            .then(res => {
              utils.gotoList( contentType );
            }); 
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
            formFields.unshift({ name: "title", label: "כותרת", type: "textfield"});
            formFields.unshift({ name: "id", label: "מזהה", type: "id"});
          break;
          case 'en':            
            formFields.unshift({ name: "title", label: "כותרת", type: "textfield"});
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

        wrapper.innerHTML = `<h1>עריכת ${typeData.label}</h1>
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
              if( field.type == 'image') {         
                fieldDiv.innerHTML += `<div class='preview'>
                  ${ editedItem[field.name]? `<img src="${ siteUrl + editedItem[field.name]}" />` : '' }
                </div>`;
              }
              else {
                fieldDiv.innerHTML += `<div class='preview'>
                  ${ editedItem[field.name] }
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
                console.log(inputField);
                editedItem.set(field.name, inputField.value , '');
                console.log(editedItem);
                location.hash = '#' + editedItem.type + '/'+ editedItem.id;
              break;
              default: 
                editedItem.set(field.name, inputField.value , language);
              break;
            }

            // revalidate field
            let errors = editedItem.validate();
            showErrors(errors , field.name );
          }
        });
              
        
       
        let submitButtons = document.createElement('div');
        let cancelButton = document.createElement('button');
        cancelButton.innerText = 'בטל';
        cancelButton.className = 'cancel';
        cancelButton.onclick = ( ()=> {
          if( confirm('האם אתה בטוח?') ) {
            localStorage.removeItem(editedItem.type+'/' + editedItem.id);
            utils.gotoList(editedItem.type);
          }
        });
        let submitButton = document.createElement('button');
        submitButton.className = 'submit';
        submitButton.innerText = 'שמור';

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
            return getUpdatedSearchFile('search/'+contentType+'.json').then( searchFiles => {
              return  files.concat(searchFiles);
            })
          })
          .then(files => {
            commitFiles('Save '+ contentType +': ' + editedItem.id , files )
            .then(res => {
              localStorage.removeItem( editedItem.type+'/' + editedItem.id );
              localStorage.removeItem( editedItem.type+'/new' );
              utils.gotoList( contentType );
            }); 
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
    return APIconnect
            .getFile ('/search/'+contentType+'.json')
            .then(response => {
              return JSON.parse(response)
            })
            .catch(error => { 
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
                  }
                  if ( ['wysiwyg','textfield'].indexOf(fieldData.type) > -1 ) {
                    indexedItem[fieldData.name] = getCleanText( editedItem[fieldData.name] );
                    return;
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
                "filePath": filePath,
                "encoding": "utf-8"
              }];
            });
  }

  /**
   * Get Search string - map item words in order to support static search
   */
  let getCleanText = function(value) {
      return value.replace(/(<([^>]+)>)/ig," ")
                  .replace(/\r?\n|\r/g,' ')
                  .replace(/[^a-zA-Z0-9א-ת ]/g,"")
  }

  return wrapper;
}


/**
 * invoke API 
 * Commit changes to the git repository
 */
export function commitFiles( commitMessage , files ) {
  
  let APIconnect = utils.getGlobalVariable('gitApi');
  return APIconnect.commitChanges( commitMessage, files);
}


/**
 * Display List of items (For the 'all' callback)
 * TODO: Add pager
 */
export function contentList( parentElement, contentType ) {
  let APIconnect = utils.getGlobalVariable('gitApi');
  let typeData = utils.getGlobalVariable('contentTypes').find(ty=>ty.name==contentType);
  let pageTitle  =  typeData.labelPlural;
  
  APIconnect.getFile('/search/'+contentType+'.json')
    .then(response=>{
      return JSON.parse(response);
    })
    .catch(exception=>{
      console.log(exception);
      utils.errorHandler(exception);
      return exception;
    })
    .then(items=>{
      if(items.length==0) {throw 'empty';}
      parentElement.innerHTML = `
                  <div>
                    <h1>${pageTitle}</h1>
                    <table>
                      <tr>
                        <th>#</th>
                        <th>לינקים</th>
                        <th>כותרת</th>                     
                      </tr>
                      ${ items.reverse().map((item) => 
                        `<tr>
                          <td>${item.id}</td>
                          <td>
                            <a href=${'#' + contentType + '/'+item.id}>ערוך</a>
                            <a style='margin-right:20px;' href=${'#' + contentType + '/'+item.id+'/delete'}>מחק</a>
                          </td>
                          
                          <td>${item.title}</td>
                          
                        </tr>` ).join("")}        
                    </table>
                  </div>`;
      
    })
    .catch( exeption=>{
      parentElement.innerHTML = `<div>
      <h1>${pageTitle}</h1>
      לא קיימים פריטים מסוג זה.
      </div>`;
    });
}
