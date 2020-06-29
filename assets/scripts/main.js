let matchGitHubPages = window.location.href.match(/(.*)github.io\/([^\/]*)/);

if ( matchGitHubPages ) {
    let baseElement = document.createElement('base');
    baseElement.href = matchGitHubPages[0];
    document.querySelector('head').appendChild(baseElement);
}