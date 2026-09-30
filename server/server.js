const config = require('./config');
const connectDB = require('./config/db');
const app = require('./app');
const { ensureBaseData } = require('./utils/bootstrap');
const { startBatchScheduler } = require('./services/batchScheduler');

async function start() {
  config.assertConfig();
  await connectDB(config.mongoUri);
  await ensureBaseData();
  startBatchScheduler(); // moves flock batches to "ready" and notifies admins as they reach target age

  const server = app.listen(config.port, () => {
    console.log(`Tower of Grace API running on port ${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start().catch((error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
