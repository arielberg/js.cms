console.log('aaaa');

let baseElement = document.createElement('base');
baseElement.href='http://google.com/';
document.querySelector('head').appendChild(baseElement);