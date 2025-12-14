
/*
* Get system variable 
* all variables should be set using this functions
*/
export let setGlobalVariable = function(variableName, variableValue){
    window[variableName] = variableValue;
}
  
/*
 * Get system variable 
 * all variables should be accessed using this functions
 */
export let getGlobalVariable = function(variableName) {
    return window[variableName];
}
  
/**
 * 
 * @param {*} property 
 * @param {*} obj 
 */
export let setLocalStorage = function(property, obj) {
    localStorage.setItem(property, JSON.stringify(obj));
}

/**
 * 
 * @param {*} property 
 */
export let getLocalStorage = function(property) {
    return JSON.parse( localStorage.getItem(property) );
}

/**
 * Load settings file (JSON). 
 * called from the page loader flow
 * Tries site config first, then falls back to cms-core defaults
 */
export let loadSystemFile = function( variableName , filePath, onSuccess ) {

    // For contentTypes, always fetch fresh (don't use cache) to ensure we get latest from GitHub
    const skipCache = variableName === 'contentTypes' || variableName === 'configContentTypes';
    
    if ( !skipCache && localStorage.getItem(variableName) ) {
      window[variableName] = JSON.parse(localStorage.getItem(variableName));
      onSuccess();
      return;
    }
  
    window[variableName] = {};
    
    // Extract filename from path (e.g., "appSettings.json" from "../config/appSettings.json")
    const fileName = filePath.split('/').pop();
    
    // Try site config first (root level), then fall back to provided path (cms-core defaults)
    const pathsToTry = [
      `/config/${fileName}`,           // Site config at root
      `../../config/${fileName}`,      // Site config relative from admin
      `../config/${fileName}`,         // Site config relative
      filePath                         // Original path (cms-core defaults)
    ];
    
    let currentPathIndex = 0;
    
    function tryNextPath() {
      if (currentPathIndex >= pathsToTry.length) {
        console.error( 'Error Loading system file: all paths failed', variableName , pathsToTry );
        onSuccess(); // Call onSuccess anyway to continue flow
        return;
      }
      
      const currentPath = pathsToTry[currentPathIndex];
      currentPathIndex++;
      
      // Add cache-busting for contentTypes to ensure fresh data
      const fetchPath = skipCache ? currentPath + '?t=' + Date.now() : currentPath;
      
      fetch(fetchPath)
        .then(function(response){
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
        }).then(function(json){
            window[variableName] = json;
            // Don't cache contentTypes in localStorage (always fetch fresh)
            if (!skipCache) {
              localStorage.setItem(variableName, JSON.stringify(json));
            }
            onSuccess();
          })
        .catch(function(error) {
          // Try next path
          tryNextPath();
        });
    }
    
    tryNextPath();
  }
/**
 * Get translation string by string key
 */
export let t = function( translationKey, language ) {
  let translations = getGlobalVariable('translations');
  return translations.find(t=>t.key == translationKey ).t[ language ]
}

 /**
 * Close edit page (navigate to content type list)
 */
export let gotoList = function( typeName ) {
  location = '#'+ typeName+'/all';
}

export let successMessage = function( message ) {
  addMessage(message,'success');
}

let addMessage = function ( message, type ) {
  let messages = [];
  if( localStorage.getItem('messages')) {
    messages = JSON.parse(localStorage.getItem('messages'));
  }

  messages.push({'time':Date.now(), 'message': message, 'type':type })
  localStorage.setItem('messages', JSON.stringify(messages) );
  showMessage();
}

export let showMessage = function() {

  if( !localStorage.getItem('messages') ) return;

  let messagesContainer = document.getElementById('messages');
  
  let messages = JSON.parse(localStorage.getItem('messages'));

  messages.forEach(message => {
    if( !document.getElementById('message_'+ message.time.toString()) ) {
      let messageElemnt = document.createElement('div');
      messageElemnt.className = 'alert alert-'+message.type;
      messageElemnt.innerHTML = message.message;
      messagesContainer.appendChild( messageElemnt );
      setTimeout( ( ()=>{ 
        messagesContainer.removeChild(messageElemnt);
        let messages = JSON.parse(localStorage.getItem('messages'));
        messages = messages.filter(m=>m.time != message.time);

        localStorage.setItem('messages', JSON.stringify(messages) );
      }) ,10000)
    }
  });
}

/**
 * Get Admin selected language (as defined in systemSettings json)
 */
export let getAdminLanguage = function( ) {
  let appSettings = getGlobalVariable('appSettings'); 
  return appSettings.Admin_Lanaguage ? appSettings.Admin_Lanaguage : 'en';
}

/**
 * Get Admin selected language (as defined in systemSettings json)
 */
export let str = function( key ) {
  let translations = getGlobalVariable('translations');
  let language = getAdminLanguage();
  let translationItem = translations.find(t=>t.key == key );
  if ( !translationItem ) return '';
  if( translationItem.t[language] ) return translationItem.t[language];
  return Object.values(translationItem.t)[0];
}


export let errorHandler = function( error ) {

  console.error(error);

  let errors = [];
  if ( localStorage.getItem('latest_errors' ) ) {
    errors = JSON.parse(localStorage.getItem('latest_errors'));
  }
 // errors = errors.filter(e=>e.time > )
  errors.push({ 'time':Date.now(), 'data':JSON.stringify(error) })
  localStorage.setItem('latest_errors', JSON.stringify(errors) );

  if( error.message ) {
    addMessage( error.message , 'danger');
  }
  else {
    addMessage( error , 'danger');
  }
}