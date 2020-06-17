import * as utils from './utils.js';

export let getRepo = function() {
  let loginParams = utils.getLocalStorage( 'secret');
  // Init API Object
  let apiRefferance = this;
  let octo = new Octokat({ 'token': loginParams.token });
  // TODO: Read from app settings
  let repo = octo.repos('arielberg', 'meshilut');
  return repo;
}

export let getApi = function(  ) {

  return getRepo().fetch()
    .then(e=>{
        repo = e;
        return e.git.refs('heads/master').fetch();
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
  return getRepo().contents(path).read();
}

/**
 * Todo: better support blob for binary files 
 */
export let commitChanges = async function( commitMessage, files ) {
  document.body.classList.add('loading');
  return getRepo().fetch()
    .then( repo =>{
      return repo.git.refs('heads/master').fetch()
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
                  console.log('tree has been added');
                  return main.update({sha: commit.sha});
                });
              })
              .then( res=> {
                utils.successMessage('Item saved successfully', res);
                return res;
              })
              .catch( res=> {
                utils.errorHandler(res);
                return res;
              })
              .finally( res=>{
                document.body.classList.remove('loading');
                return res;
              });
          });
        });
}