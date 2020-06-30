# JS-CMS
Js-Cms is a CMS that enables dynamic editing of pages that will be hosted on CDN or static pages provider (GithubPages etc.)

The content of the site can be edited dynamically as a normal CMS but then, instead of adding the new data to the DB - static HTML & JSON pages are created and uploaded to the CDN (using the CDN's API).

This enables the following features: 
* Hosting can be 100% Free  
* Super performance
* Track changes in the site using the commit.
* Easy rollbacks and all the benefits GIT features.


## Installation (GitHub Pages)
* fork this repository
* enable github pages on the forked repo
* create a Personal Access Token ( github settings > eveloper settings > Personal access tokens )
* update admin/appSettings.json with your username and forked branch name
* go to http://your-repository-url/admin login with your access token as password
* Start creating and editing your content

## Settings Files 
* admin/appSettings.json - importent generic information (languages, hosting provider, url, etc.)
* admin/contentTypes.json - The content types that will be used in your site and the fields for each content type (Pages, Posts, Members, Etc.) 
* admin/

## Examples
* https://arielberg.github.io/js.cms/ (This site with no design & data)
* https://arielberg.github.io/meshilut/
