import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes — must be registered before the static/SPA fallback
app.use("/api", router);

// Serve the Vite-built React SPA (production only).
// Railway runs this from the project root so process.cwd() is the repo root.
const frontendDist = path.resolve(
  process.cwd(),
  "artifacts",
  "khata-app",
  "dist",
  "public",
);

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // SPA fallback: return index.html for every path not handled by /api,
  // so that wouter (client-side router) can take over.
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.warn(
    { frontendDist },
    "Frontend dist not found — API-only mode. Build khata-app first.",
  );
}

export default app;
