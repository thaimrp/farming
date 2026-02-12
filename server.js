require('dotenv').config();

const validateEnv = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function bootstrap() {
  try {
    validateEnv();
    await connectDB();
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error('Bootstrap failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
