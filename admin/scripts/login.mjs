import * as utils from './utils.js'; 
import * as main from './script.mjs'; 
import * as api from './GitHubAPI.mjs';


/**
 * Handle login ( using GIT credentials )
 * Currently only GitHub is supported.
 */
export function doLogin( parentComponent ) {

  /**
   * When secret exists. Creates the GitAPI Object
   */
  let createAPIObject = function() {
   
    let appSettings = utils.getGlobalVariable('appSettings');
    let apiClassName = appSettings['API_Gate'];

    // TODO: Support other APIs
    // invoke API class
    api.getApi()
        .then( api_gateway => {
          utils.setGlobalVariable( 'gitApi', api );
          document.getElementById('pageWrapper').classList.remove('hideLeftBar');
          main.routeToCall();
        })
        .catch( errorMessage=> {
          localStorage.removeItem('secret');
          utils.loadLoginForm(errorMessage);
        });
  };

  /**
   * Render the login form. should be called if secret not exists and re-render on 
   * error
   * @param {*} errorMessage 
   */
  let loadLoginForm = function( errorMessage ) {
    // create login form
    parentComponent.innerHTML = `<form className='loginForm'>
                                  <h3>התנועה למשילות - כניסה לממשק ניהול</h3>
                                  ${ errorMessage ? `<div class="alert alert-danger" role="alert">${errorMessage}</div>` : '' }
                                  <div><label>שם:</label><input name='name' type='text' placeholder='שם משתמש' /></div>
                                  <div><label>סיסמא:</label><input name='password' type='text' placeholder='סיסמא' /></div>
                                  <input type='submit' value='היכנס' />
                                </form>`;
                              
    // form callback
    parentComponent.children[0].onsubmit = function(event) {  
      event.preventDefault();
      utils.setLocalStorage( 'secret', {'name':'event.target.name.value ','token':event.target.password.value });
      createAPIObject();
    }
  }

  // User already submitted his credentials
  if (  localStorage.getItem('secret' ) ) {

    createAPIObject();

  }
  // User has not submitted his credentials
  else {
    loadLoginForm();
  }
}