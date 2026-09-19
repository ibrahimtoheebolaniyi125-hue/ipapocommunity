require('dotenv').config();

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
  if (res.writableEnded) {
    return;
  }

  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization',
    'Access-Control-Allow-Methods':
      'GET, POST, OPTIONS'
  });

  res.end(JSON.stringify(payload));
}

/*
|--------------------------------------------------------------------------
| API ROUTE ALIASES
|--------------------------------------------------------------------------
|
| These allow both:
|
| /api/news?action=unseen
|
| and:
|
| /api/news/unseen
|
| to reach the same API handler.
|
*/

const API_ROUTE_MAP = {
  'news/story': {
    route: 'news',
    action: 'story'
  },

  'news/seen': {
    route: 'news',
    action: 'seen'
  },

  'news/unseen': {
    route: 'news',
    action: 'unseen'
  },

  'admin/dashboard': {
    route: 'admin',
    action: 'dashboard'
  },

  'admin/approve': {
    route: 'admin',
    action: 'approve'
  },

  'admin/reject': {
    route: 'admin',
    action: 'reject'
  },

  'push/config': {
    route: 'push',
    action: 'config'
  },

  'push/subscribe': {
    route: 'push',
    action: 'subscribe'
  },

  'push/unsubscribe': {
    route: 'push',
    action: 'unsubscribe'
  },

  'activity/log': {
    route: 'activity',
    action: 'log'
  },

  'cron/daily-fetch': {
    route: 'cron',
    action: 'daily-fetch'
  }
};

async function invokeApi(req, res) {
  const url = new URL(
    req.url,
    'http://localhost'
  );

  let route = url.pathname
    .replace(/^\/api\//, '')
    .replace(/^\//, '');

  console.log(
    `API request: ${req.method} ${url.pathname}${url.search}`
  );

  if (!route) {
    return sendJson(res, 404, {
      success: false,
      error: 'API route not found'
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Resolve API aliases
  |--------------------------------------------------------------------------
  */

  const mapped = API_ROUTE_MAP[route];

  if (mapped) {
    route = mapped.route;

    if (!url.searchParams.has('action')) {
      url.searchParams.set(
        'action',
        mapped.action
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Find API file
  |--------------------------------------------------------------------------
  */

  const candidates = [
    path.join(
      root,
      'api',
      `${route}.js`
    ),

    path.join(
      root,
      'api',
      route,
      'index.js'
    )
  ];

  const apiEntry = candidates.find(
    candidate => fs.existsSync(candidate)
  );

  if (!apiEntry) {
    console.error(
      `API file not found for route: ${route}`
    );

    return sendJson(res, 404, {
      success: false,
      error: 'API route not found',
      route
    });
  }

  console.log(
    `Loading API handler: ${apiEntry}`
  );

  try {
    /*
    |--------------------------------------------------------------------------
    | Load handler
    |--------------------------------------------------------------------------
    */

    const handler = require(apiEntry);

    /*
    |--------------------------------------------------------------------------
    | Build query object
    |--------------------------------------------------------------------------
    */

    const query =
      Object.fromEntries(
        url.searchParams.entries()
      );

    console.log(
      'API query:',
      query
    );

    /*
    |--------------------------------------------------------------------------
    | Build request object
    |--------------------------------------------------------------------------
    */

    const request = {
      method: req.method || 'GET',
      headers: req.headers || {},
      query,
      body: req.body
    };

    /*
    |--------------------------------------------------------------------------
    | Build Express-like response object
    |--------------------------------------------------------------------------
    */

    let statusCode = 200;
    let responseSent = false;

    const apiRes = {
      status(code) {
        statusCode = Number(code) || 200;
        return apiRes;
      },

      json(payload) {
        if (responseSent) {
          return apiRes;
        }

        responseSent = true;

        sendJson(
          res,
          statusCode,
          payload
        );

        return apiRes;
      },

      send(payload) {
        if (responseSent) {
          return apiRes;
        }

        responseSent = true;

        if (
          typeof payload === 'object' &&
          payload !== null
        ) {
          sendJson(
            res,
            statusCode,
            payload
          );
        } else {
          res.writeHead(
            statusCode,
            {
              'Content-Type':
                'text/plain; charset=utf-8'
            }
          );

          res.end(
            String(payload)
          );
        }

        return apiRes;
      }
    };

    /*
    |--------------------------------------------------------------------------
    | Execute API handler
    |--------------------------------------------------------------------------
    */

    await handler(
      request,
      apiRes
    );

    /*
    |--------------------------------------------------------------------------
    | Safety fallback
    |--------------------------------------------------------------------------
    */

    if (
      !responseSent &&
      !res.writableEnded
    ) {
      sendJson(
        res,
        204,
        {}
      );
    }
  } catch (error) {
    console.error(
      'API error:',
      error
    );

    if (!res.writableEnded) {
      return sendJson(
        res,
        500,
        {
          success: false,
          error:
            error.message ||
            'Internal server error'
        }
      );
    }
  }
}

/*
|--------------------------------------------------------------------------
| Serve normal website files
|--------------------------------------------------------------------------
*/

function serveFile(
  res,
  filePath
) {
  const resolved = path.join(
    root,
    filePath
  );

  fs.readFile(
    resolved,
    (err, data) => {
      if (err) {
        return sendJson(
          res,
          404,
          {
            success: false,
            error: 'File not found'
          }
        );
      }

      const ext =
        path.extname(
          resolved
        ).toLowerCase();

      res.writeHead(
        200,
        {
          'Content-Type':
            mimeTypes[ext] ||
            'application/octet-stream'
        }
      );

      res.end(data);
    }
  );
}

/*
|--------------------------------------------------------------------------
| Read POST body
|--------------------------------------------------------------------------
*/

function readBody(req) {
  return new Promise(
    resolve => {
      const chunks = [];

      req.on(
        'data',
        chunk => {
          chunks.push(chunk);
        }
      );

      req.on(
        'end',
        () => {
          const raw =
            Buffer.concat(
              chunks
            ).toString('utf8');

          if (!raw) {
            return resolve(
              undefined
            );
          }

          try {
            resolve(
              JSON.parse(raw)
            );
          } catch (error) {
            console.warn(
              'Invalid JSON body.'
            );

            resolve(
              undefined
            );
          }
        }
      );

      req.on(
        'error',
        error => {
          console.error(
            'Request body error:',
            error
          );

          resolve(
            undefined
          );
        }
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| HTTP SERVER
|--------------------------------------------------------------------------
*/

const server =
  http.createServer(
    async (req, res) => {
      const url = new URL(
        req.url,
        'http://localhost'
      );

      /*
      |--------------------------------------------------------------------------
      | CORS preflight
      |--------------------------------------------------------------------------
      */

      if (
        req.method ===
        'OPTIONS'
      ) {
        res.writeHead(
          204,
          {
            'Access-Control-Allow-Origin':
              '*',

            'Access-Control-Allow-Headers':
              'Content-Type, Authorization',

            'Access-Control-Allow-Methods':
              'GET, POST, OPTIONS'
          }
        );

        return res.end();
      }

      /*
      |--------------------------------------------------------------------------
      | API REQUEST
      |--------------------------------------------------------------------------
      */

      if (
        url.pathname.startsWith(
          '/api/'
        )
      ) {
        if (
          ![
            'GET',
            'HEAD'
          ].includes(
            req.method
          )
        ) {
          req.body =
            await readBody(req);
        }

        return invokeApi(
          req,
          res
        );
      }

      /*
      |--------------------------------------------------------------------------
      | HOME PAGE
      |--------------------------------------------------------------------------
      */

      if (
        url.pathname === '/'
      ) {
        return serveFile(
          res,
          'index.html'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | STATIC FILE
      |--------------------------------------------------------------------------
      */

      const requested =
        url.pathname.replace(
          /^\//,
          ''
        );

      const target =
        path.join(
          root,
          requested
        );

      if (
        requested &&
        fs.existsSync(target) &&
        fs.statSync(target).isFile()
      ) {
        return serveFile(
          res,
          requested
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SPA FALLBACK
      |--------------------------------------------------------------------------
      */

      return serveFile(
        res,
        'index.html'
      );
    }
  );

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const port =
  process.env.PORT ||
  3000;

server.listen(
  port,
  () => {
    console.log(
      `Ipapo server running at http://localhost:${port}`
    );
  }
);
