import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import uploadRouter from "../upload-route";
import { setupWebSocketUpload } from "../uploadWebSocket";
import { currentLogFile } from "../logger";

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
  
  // Setup WebSocket for upload
  setupWebSocketUpload(server);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Upload endpoint
  app.use(uploadRouter);
  app.get("/logs/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const flush = (res as any).flushHeaders as (() => void) | undefined;
    if (typeof flush === "function") {
      flush.call(res);
    }

    res.write(`data: ready\n\n`);

    let activePath = currentLogFile();
    let position = 0;
    let closed = false;

    const pump = async () => {
      if (closed) return;
      const nextPath = currentLogFile();
      if (nextPath !== activePath) {
        activePath = nextPath;
        position = 0;
      }

      try {
        const stats = await fsp.stat(activePath);
        if (stats.size < position) {
          position = 0;
        }
        if (stats.size > position) {
          await new Promise<void>((resolve, reject) => {
            const stream = fs.createReadStream(activePath, {
              encoding: "utf8",
              start: position,
            });
            stream.on("data", chunk => {
              if (typeof chunk === "string") {
                position += Buffer.byteLength(chunk);
                const lines = chunk.split(/\r?\n/).filter(Boolean);
                for (const line of lines) {
                  res.write(`data: ${line}\n\n`);
                }
              }
            });
            stream.on("error", reject);
            stream.on("end", () => resolve());
          });
        }
      } catch (error: any) {
        if (error?.code !== "ENOENT") {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
        }
      }
    };

    const interval = setInterval(() => {
      void pump();
    }, 1000);

    req.on("close", () => {
      closed = true;
      clearInterval(interval);
    });

    void pump();
  });
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

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
