const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;
const fs = require('fs');

const server = http.createServer((req, res) => {
  let parts = req.url.split('/');
  parts.shift();
  res.setHeader("Access-Control-Allow-Origin", "*");
  switch(parts.shift()) {
    case 'get':     
      try { 
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end( fs.readFileSync('../' + parts.join('/'),  {encoding:'utf8', flag:'r'}));
        return;
      }
      catch(exp) {}
    break;
    case 'isAlive':
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end( 'success!' );
    return;
    case 'save-files':
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');

      req.on('data', chunk => {
        let files = JSON.parse(chunk);
        files.forEach( fileData => {

          let fileLocalPath = __dirname.replace('localServer','')+'/'+fileData.filePath;

          if ( fileData.encoding == 'base64' ) {
            var buf = Buffer.from(fileData.content, 'base64');
            fs.writeFileSync(fileLocalPath, buf);
          }
          else {   
            fs.mkdir( require('path').dirname(fileLocalPath) , { recursive: true }, (err) => { });
            fs.writeFileSync( fileLocalPath, fileData.content, (err,data) => {});
          }
        });     
      });
      req.on('end', () => {
        res.end( 'done');
      })
    return;
  }
  res.statusCode = 500;
  res.end('cannot parse request');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
