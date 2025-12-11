import * as utils from '../utils.js';

export let getRepo = function() {
  let loginParams = utils.getLocalStorage('secret');
  let appSettings = utils.getGlobalVariable('appSettings');
 
  let octo = new Octokat({ 'token': loginParams.token });
  // TODO: Read from app settings
  let repo = octo.repos(appSettings.API_Params[0], appSettings.API_Params[1]);
  return repo;
}

export let getApi = function(  ) {

  return getRepo().fetch()
    .then(e=>{
        repo = e;
        return e.git.refs('heads/main').fetch();
    })
    .then(e=>{
        return e;
    })
    .catch(exception=>{
        return exception;
    });
}

  
let createBlob = function( path, content, encoding ) {
  let repo = getRepo();
  
  return repo.git.blobs
      .create({ content: content, encoding: encoding, })
      .then(createdBlob => {
          console.log('blob created for '+ path);
          return { path: path,   
                    sha: createdBlob.sha,
                    mode: "100644",
                    type: "blob" }
      });
}

/**
 * Fetch file from repository
 * @param path - file path
 */
export let getFile = async function( path ) {
  // Remove leading slash to avoid double slashes in API URL
  // Octokat's contents() method may add a slash, so we ensure no leading slash
  let normalizedPath = path;
  if (typeof path === 'string') {
    normalizedPath = path.replace(/^\/+/, '');
  }
  console.log('getFile called with path:', path, 'normalized to:', normalizedPath);
  return getRepo().contents(normalizedPath).read();
}

/**
 * Todo: better support blob for binary files 
 */
export let commitChanges = async function( commitMessage, files ) {
  document.body.classList.add('loading');
  return getRepo().fetch()
    .then( repo =>{
      return repo.git.refs('heads/main').fetch()
        .then(main=> {
          // build files
          return  Promise.all(
                files.map( fileData => {
                  return createBlob( fileData.filePath, fileData.content , fileData.encoding);
                })
              )
              // call commit
            .then( filesTree =>{
              console.log('commit start - build tree');
              return repo.git.trees.create({
                  tree: filesTree,
                  base_tree: main.object.sha
                }).then( tree => {
                  return repo.git.commits.create({
                    message: commitMessage,
                    tree: tree.sha,
                    parents: [main.object.sha] })
                }).then( commit => {
                  console.log('tree has been added, commit SHA:', commit.sha);
                  return main.update({sha: commit.sha}).then(ref => {
                    // Return both the commit and ref for verification
                    return {
                      commit: commit,
                      ref: ref,
                      sha: commit.sha,
                      success: true
                    };
                  });
                });
              })
              .then( res=> {
                console.log('Commit successful:', res);
                // Verify the commit actually succeeded
                if (!res || !res.sha || !res.success) {
                  console.error('Commit response invalid:', res);
                  throw new Error('Commit response invalid');
                }
                console.log('Commit verified - SHA:', res.sha);
                return res;
              })
              .catch( error=> {
                console.error('Commit failed:', error);
                document.body.classList.remove('loading');
                // Re-throw the error so the caller can handle it
                throw error;
              })
              .finally( ()=>{
                document.body.classList.remove('loading');
              });
          });
        });
}