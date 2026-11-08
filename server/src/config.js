import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const serverRoot = path.resolve(here, "..");
export const publicDir = path.join(serverRoot, "public");
export const dbFile = process.env.DB_FILE || path.join(serverRoot, "data", "app.db");
export const port = Number(process.env.PORT || 8787);
export const jwtSecret = process.env.JWT_SECRET || "before-graduation-local-secret";
export const webDist = path.resolve(serverRoot, "..", "web", "dist");
