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
    switch ( fieldData.type ) {
      case "image":
        fieldContent = '<img src="/'+value+'" />';
      break;
      case "file":
        fieldContent = '<a href="'+value+'" >' + utils.t('viewFile', language) + '</a>';
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
 
    return fetch('templates/base.html')
            .then(result=> result.text())
            .then( baseTemplate => {
              // TODO: Support multiple menus
              return APIconnect.getFile('/cms-core/admin/menus/main.json')
                                .then( menu => { return JSON.parse(menu) })
                                .then( jsonMenu => {
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
                  
                  return {
                    "content":  new Function("return `" + baseTemplate + "`;").call(templateVars),
                    "filePath": ( isDefaultLanguage ? '': language+'/' )+editItemObj.getURL(false)+'/index.html',
                    "encoding": "utf-8" 
                  }
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
   * Render HTML menu from JSON
   */
  export function renderMenu( jsonMenu ) {
    let menuHtml = '';
    if( jsonMenu ) {
      menuHtml = `<ul class='navbar-nav'>`;
      jsonMenu.forEach( menuItem => {
          if ( menuItem.subItems ) { 
            menuHtml += `<li class='nav-item dropdown'>
              <a>${ menuItem.label }</a>
              <div class="dropdown-menu" aria-labelledby="navbarDropdownMenuLink">
                  ${ menuItem.subItems
                      .map( menuSubItem=>`<a class="dropdown-item"  href="/${ menuSubItem.url }">${ menuSubItem.label }</a>`)
                      .join('') }
              </div>
            </li>\n`;
          }
          else { 
            menuHtml += `<li><a href="/${ menuItem.url }">${ menuItem.label }</a></li>\n`;
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
      return value;
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
  
  APIconnect.getFile('/search/'+contentType+'.json')
    .then(response=>{
      return JSON.parse(response);
    })
    .catch(exception=>{
      console.log(exception);
      return [];
    })
    .then(items=>{
      if(items.length==0) {throw 'empty';}
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
