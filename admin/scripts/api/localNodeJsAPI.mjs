
let localServer = 'http://127.0.0.1:3000'
export let getApi = function() {
    return new Promise(resolve => {
        resolve('Success!');
    });
 }

export let getFile = async function( path ) { 
    return fetch(localServer+'/get/'+path).then(r=>r.text());
}

export let commitChanges = async function( commitMessage, files ) {
    return fetch(localServer+'/save-files',  {  
        method: 'POST',  
        body: JSON.stringify( files ),  
      })     
      .then(function (data) {  
        console.log('Request success: ', data);  
      })  
      .catch(function (error) {  
        console.log('Request failure: ', error);  
      });
}