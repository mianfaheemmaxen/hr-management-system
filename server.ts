/**
 * Custom Next.js Server
 *
 * Replaces `next start` so that the biometric scheduler boots immediately
 * when the server process starts — not lazily on the first HTTP request.
 *
 * Usage:
 *   Production : tsx server.ts   (or: NODE_ENV=production tsx server.ts)
 *   PM2        : pm2 start ecosystem.config.js
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { startBiometricScheduler } from "./lib/biometric/scheduler";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // ── Start biometric scheduler immediately on server boot ──────────────
    // This runs ONCE in the server process, before any HTTP request arrives.
    // In PM2 fork mode (single process) this gives you exactly one scheduler.
    // In PM2 cluster mode set instances: 1 in ecosystem.config.js to avoid
    // spawning duplicate cron jobs.
    startBiometricScheduler();

    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url ?? "/", true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", req.url, err);
        res.statusCode = 500;
        res.end("Internal server error");
      }
    }).listen(port, () => {
      console.log(`> Next.js ready on http://${hostname}:${port}`);
      console.log(`> Biometric scheduler running (timezone: Asia/Karachi)`);
      console.log(`>   Employee sync : every 1 hour`);
      console.log(`>   Attendance sync: every 5 minutes`);
    });
  })
  .catch((err) => {
    console.error("Fatal: could not start server", err);
    process.exit(1);
  });
