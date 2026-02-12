const mongoose = require('mongoose');

function buildMongoUriFromParts() {
  const user = encodeURIComponent(process.env.MONG_USER || '');
  const pass = encodeURIComponent(process.env.MONG_PASS || '');
  const host = process.env.MONG_HOST || '';
  const database = process.env.MONG_DATABASE || '';
  const options = process.env.MONG_OPTIONS || 'retryWrites=true&w=majority';

  if (!user || !pass || !host || !database) {
    return '';
  }

  return `mongodb+srv://${user}:${pass}@${host}/${database}?${options}`;
}

function getMongoUri() {
  return process.env.MONGODB_URI || buildMongoUriFromParts();
}

async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MongoDB configuration is missing. Set MONGODB_URI or MONG_USER/MONG_PASS/MONG_HOST/MONG_DATABASE');
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = connectDB;
