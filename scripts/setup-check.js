const mongoose = require('mongoose');
(async () => {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith('replace-')) throw new Error('Set a random SESSION_SECRET of at least 32 characters.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.db.command({ ping: 1 });
  console.log('PASS: configuration and MongoDB connection. No database data was changed.');
})().catch(error => { console.error('Setup check failed: ' + error.message.replace(/mongodb[^\s]*/g, '[database address]')); process.exitCode = 1; }).finally(() => mongoose.disconnect());