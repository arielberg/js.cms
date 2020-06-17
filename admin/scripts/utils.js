
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
 */
export let loadSystemFile = function( variableName , filePath, onSuccess ) {

    if ( localStorage.getItem(variableName) ) {
      window[variableName] = JSON.parse(localStorage.getItem(variableName));
      onSuccess();
      return;
    }
  
    window[variableName] = {};
    
    fetch(filePath)
      .then(function(response){
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      }).then(function(json){
          window[variableName] = json;
          onSuccess();
        })
      .catch(function(error) {
        console.error( 'Error Loading system file', error , variableName , filePath );
      });
  }
/**
 * Get translation string by string key
 */
export let t = function( translationKey, language ) {
  let translations = getGlobalVariable('translations');
  return translations.find(t=>t.key == translationKey ).t[ language==''?'he': language ]
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

export let errorHandler = function( error ) {
  console.log(error);

  let errors = [];
  if ( localStorage.getItem('latest_errors' ) ) {
    errors = JSON.parse(localStorage.getItem('latest_errors'));
  }
 // errors = errors.filter(e=>e.time > )
  errors.push({ 'time':Date.now(), 'data':JSON.stringify(error) })
  localStorage.setItem('latest_errors', JSON.stringify(errors) );

  if( error.message ) {
    addMessage( error.message+' -- '+(new Error().stack) , 'danger');
  }
  else {
    addMessage( error , 'danger');
  }
}