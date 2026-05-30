const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3099;
const BUILD = path.join(__dirname, 'build');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(BUILD, url === '/' ? 'index.html' : url);
  if (!path.extname(file)) file = path.join(BUILD, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('Serving on http://localhost:' + PORT));
