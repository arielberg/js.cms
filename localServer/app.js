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

      var bodyparts = [];
      var bodylength = 0;

      req.on('data', chunk => {
        bodyparts.push(chunk);
        bodylength += chunk.length;
      });

      req.on('end', function(){
        var body = new Buffer(bodylength);
        var bodyPos=0;
        for (var i=0; i < bodyparts.length; i++) {
            bodyparts[i].copy(body, bodyPos, 0, bodyparts[i].length);
            bodyPos += bodyparts[i].length;
        }
        
        let files = JSON.parse(body);
        
        files.forEach( fileData => {

          let fileLocalPath = __dirname.replace('localServer','')+'/'+fileData.filePath;
          
          if ( fileData.encoding == 'base64' ) {
            var buf = Buffer.from(fileData.content, 'base64');
            fs.writeFileSync(fileLocalPath, buf);
          }
          else {              
            fs.mkdir( require('path').dirname(fileLocalPath).replace('//','/') , { recursive: true }, (err) => { });
            fs.writeFileSync( fileLocalPath, fileData.content, (err,data) => {});
          }
        });  
        res.end( 'done');   
      });
    return;
  }
  res.statusCode = 500;
  res.end('cannot parse request');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
