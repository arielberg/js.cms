
/**
 * All api function must implement this interface
 */

// login
export let getApi = function() { }

// get a single file from the repository (normally json settings file)
export let getFile = async function( path ) { }

// do a commit - commit the list of @files to the repository with the @commitMessage message
export let commitChanges = async function( commitMessage, files ) {}