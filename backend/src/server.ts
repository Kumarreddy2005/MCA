import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  // Connect to database
  await connectDatabase();

  // Create Express app
  const app = createApp();

  // Start listening
  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 VCGIS Backend running on port ${config.PORT}`);
    logger.info(`📡 API prefix: ${config.API_PREFIX}`);
    logger.info(`🌍 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});
