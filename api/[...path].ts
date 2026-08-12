import { createApp } from "../server/app";

/**
 * Vercel treats the default export as a Node serverless handler. The shared
 * Express app handles tRPC, OAuth callbacks, and storage proxy routes under
 * /api while Vercel's CDN serves the built Vite application.
 */
const app = createApp();

export default app;
