const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dist');
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

http.createServer((req, res) => {
  let fp = path.join(dir, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(fp);
  const mime = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(8080, () => console.log('Server running on http://localhost:8080'));
