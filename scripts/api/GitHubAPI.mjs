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
  // Validate files array
  if (!files || !Array.isArray(files) || files.length === 0) {
    const error = new Error('No files to commit');
    console.error('Commit failed:', error);
    throw error;
  }
  
  // Validate each file has required properties
  for (const file of files) {
    if (!file.filePath || file.content === undefined) {
      const error = new Error(`Invalid file data: missing filePath or content`);
      console.error('Commit failed:', error);
      throw error;
    }
  }
  
  document.body.classList.add('loading');
  
  try {
    const repo = await getRepo().fetch();
    const main = await repo.git.refs('heads/main').fetch();
    
    // Create blobs for all files
    const filesTree = await Promise.all(
      files.map( fileData => {
        return createBlob( fileData.filePath, fileData.content , fileData.encoding);
      })
    );
    
    console.log('commit start - build tree');
    
    // Create tree
    const tree = await repo.git.trees.create({
      tree: filesTree,
      base_tree: main.object.sha
    });
    
    // Create commit
    const commit = await repo.git.commits.create({
      message: commitMessage,
      tree: tree.sha,
      parents: [main.object.sha]
    });
    
    console.log('tree has been added, commit SHA:', commit.sha);
    
    // Update ref
    const ref = await main.update({sha: commit.sha});
    
    // Return result
    const result = {
      commit: commit,
      ref: ref,
      sha: commit.sha,
      success: true
    };
    
    console.log('Commit successful:', result);
    
    // Verify the commit actually succeeded
    if (!result || !result.sha || !result.success) {
      console.error('Commit response invalid:', result);
      throw new Error('Commit response invalid');
    }
    
    console.log('Commit verified - SHA:', result.sha);
    return result;
    
  } catch (error) {
    console.error('Commit failed:', error);
    // Re-throw the error so the caller can handle it
    throw error;
  } finally {
    // Always remove loading class
    document.body.classList.remove('loading');
  }
}