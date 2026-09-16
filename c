{
  "version": 2,
  "builds": [
    { "src": "api/*.js", "use": "@vercel/node" },
    { "src": "**/*.html", "use": "@vercel/static" },
    { "src": "**/*.css", "use": "@vercel/static" },
    { "src": "**/*.js", "use": "@vercel/static" },
    { "src": "**/*.jpg", "use": "@vercel/static" },
    { "src": "**/*.JPG", "use": "@vercel/static" },
    { "src": "**/*.png", "use": "@vercel/static" },
    { "src": "**/*.svg", "use": "@vercel/static" },
    { "src": "**/*.webp", "use": "@vercel/static" },
    { "src": "**/*.ico", "use": "@vercel/static" },
    { "src": "**/*.json", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/news/(story|seen|unseen)", "dest": "/api/news?action=$1" },
    { "src": "/api/admin/(dashboard|approve|reject)", "dest": "/api/admin?action=$1" },
    { "src": "/api/push/(config|subscribe|unsubscribe)", "dest": "/api/push?action=$1" },
    { "src": "/api/activity/log", "dest": "/api/activity?action=log" },
    { "src": "/api/cron/daily-fetch", "dest": "/api/cron?action=daily-fetch" },
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ],
  "crons": [
    { "path": "/api/cron/daily-fetch", "schedule": "0 0 * * *" }
  ],
  "cleanUrls": true,
  "trailingSlash": false
}