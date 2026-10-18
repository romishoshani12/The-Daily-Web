const mongoose = require('mongoose');
const { createApp } = require('./app');
async function main() {
  const app = createApp();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const server = app.listen(Number(process.env.PORT ?? 3000), () => console.info(JSON.stringify({ event: 'server.started', port: server.address().port })));
  async function stop() { server.close(async () => { await mongoose.disconnect(); process.exit(0); }); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch(error => { console.error(error.message); process.exit(1); });
