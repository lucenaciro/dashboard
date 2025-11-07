import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import uploadRouter from "../upload-route";
import { setupWebSocketUpload } from "../uploadWebSocket";
import { logDatabaseConnection } from "../db";
import { logger } from "../logger";
import type { LogEntry } from "../logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  logDatabaseConnection("app");
  
  // Setup WebSocket for upload
  setupWebSocketUpload(server);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Upload endpoint
  app.use(uploadRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (process.env.NODE_ENV === "development") {
    app.get("/logs/stream", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const flush = (res as unknown as { flushHeaders?: () => void }).flushHeaders;
      flush?.();

      const send = (entry: LogEntry) => {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
      };

      const unsubscribe = logger.subscribe(send);

      req.on("close", () => {
        unsubscribe();
        res.end();
      });
    });
  }

  if (port !== preferredPort) {
    logger.warn("server:port-adjusted", { preferredPort, port });
  }

  server.listen(port, () => {
    logger.info("server:listening", { port });
  });
}

startServer().catch(error => {
  logger.error("server:start_failed", { error });
  process.exitCode = 1;
});
