/*
 * Support editing content while working offline using Node.Js
 * 
 * The API set all changes. and they can be then commited using GIT commands.
 * It is design to truck extend changes without commiting
 * 
 * Local server must run for this API to work 
 * (node /localserver/app.js)
 */

let localServer = 'http://127.0.0.1:3000'

/**
 * Login - Runs locally. no need of authentication
 */
export let getApi = function() {
    return new Promise(resolve => {
      return fetch( localServer+'/isAlive' ).then( r=>  resolve('Success!') );
    });
}

/**
 * Get a file from the repository (normally json setting file) 
 * @param path - path of the required file
 */
export let getFile = async function( path ) { 
    return fetch(localServer+'/get/'+path).then(r=>r.text());
}

/**
 * Set files - THIS CALL WILL NOT DO A COMMIT!!!
 * 
 * The node.js server will just update the files. they need to be commited manully.
 * 
 * @param files - list of the files to upsert
 */
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