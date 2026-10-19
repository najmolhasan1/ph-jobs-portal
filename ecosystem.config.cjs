// PM2 config for a VPS: keeps the website and the always-on scraper worker running,
// restarts them on crash and on reboot (after `pm2 startup`).
//   npm run build && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    { name: "ph-jobs-web", script: "npm", args: "start", env: { NODE_ENV: "production" } },
    { name: "ph-jobs-worker", script: "npm", args: "run worker", restart_delay: 10_000 },
  ],
};
