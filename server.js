const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function invokeApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');

  if (!route) {
    return sendJson(res, 404, { success: false, error: 'API route not found' });
  }

  const candidates = [
    path.join(root, 'api', `${route}.js`),
    path.join(root, 'api', route, 'index.js')
  ];

  const apiEntry = candidates.find((candidate) => fs.existsSync(candidate));

  if (apiEntry) {
    try {
      const handler = require(apiEntry);
      const request = { ...req, query: Object.fromEntries(url.searchParams.entries()), method: req.method || 'GET' };
      const apiRes = {
        ...res,
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          sendJson(res, this.statusCode || 200, payload);
          return this;
        },
        send(payload) {
          if (typeof payload === 'object' && payload !== null) {
            sendJson(res, this.statusCode || 200, payload);
          } else {
            res.writeHead(this.statusCode || 200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(String(payload));
          }
          return this;
        }
      };
      await handler(request, apiRes);
      return;
    } catch (error) {
      console.error('API error:', error);
      return sendJson(res, 500, { success: false, error: error.message });
    }
  }

  return sendJson(res, 404, { success: false, error: 'API route not found' });
}

function serveFile(res, filePath) {
  const resolved = filePath === 'index.html' ? path.join(root, filePath) : path.join(root, filePath);

  fs.readFile(resolved, (err, data) => {
    if (err) {
      sendJson(res, 404, { success: false, error: 'File not found' });
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    return invokeApi(req, res);
  }

  if (url.pathname === '/') {
    return serveFile(res, 'index.html');
  }

  const requested = url.pathname.replace(/^\//, '');
  const target = path.join(root, requested);

  if (requested && fs.existsSync(target) && fs.statSync(target).isFile()) {
    return serveFile(res, requested);
  }

  return serveFile(res, 'index.html');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Ipapo server running at http://localhost:${port}`);
});
