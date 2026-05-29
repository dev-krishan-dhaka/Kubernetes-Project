require('dotenv').config();

console.log("🔥🔥🔥 NEW BACKEND FILE DEPLOYED SUCCESSFULLY hahaha 🔥🔥🔥");
console.log("🚀 DEPLOY TIME:", new Date().toISOString());

const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const client = require('prom-client');
const responseTime = require('response-time');

const app = express();


// =====================================
// ✅ OPEN CORS (TEMP FIX)
// =====================================

app.use(cors({
  origin: true,
  credentials: true
}));

console.log("✅ OPEN CORS ENABLED");


// =====================================
// ✅ METRICS SETUP
// =====================================

client.register.clear();

const collectDefaultMetrics =
  client.collectDefaultMetrics;

collectDefaultMetrics({
  register: client.register
});

const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users in last hour',
  labelNames: ['status']
});

const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user signups',
  labelNames: ['status']
});

const userLogins = new client.Counter({
  name: 'user_logins_total',
  help: 'Total login attempts',
  labelNames: ['result']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});


// =====================================
// ✅ RESPONSE TIME MIDDLEWARE
// =====================================

app.use(responseTime((req, res, time) => {

  const endpoint =
    req.route
      ? req.route.path
      : req.path;

  httpRequestDuration
    .labels(
      req.method,
      endpoint,
      res.statusCode
    )
    .observe(time / 1000);
}));


// =====================================
// ✅ JSON PARSER
// =====================================

app.use(express.json());


// =====================================
// ✅ METRICS ACCESS
// =====================================

app.set('metrics', {
  userRegistrations,
  userLogins,
  httpRequestDuration
});


// =====================================
// ✅ REQUEST LOGGER
// =====================================

app.use((req, res, next) => {

  console.log(
    `📡 ${req.method} ${req.originalUrl}`
  );

  next();
});


// =====================================
// ✅ ROUTES
// =====================================

app.use('/api/users', userRoutes);


// =====================================
// ✅ HEALTH CHECK
// =====================================

app.get('/health', (req, res) => {

  res.json({
    status: 'OK',
    uptime: process.uptime(),
    message: '🔥 NEW BACKEND IS RUNNING'
  });
});


// =====================================
// ✅ METRICS ENDPOINT
// =====================================

app.get('/metrics', async (req, res) => {

  res.setHeader(
    'Content-Type',
    client.register.contentType
  );

  const metrics =
    await client.register.metrics();

  res.send(metrics);
});


// =====================================
// ✅ ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {

  console.error('❌ ERROR:', err.stack);

  res.status(err.status || 500).json({
    message:
      err.message ||
      'Something went wrong!'
  });
});


// =====================================
// ✅ SERVER START
// =====================================

const PORT =
  process.env.PORT || 5000;

connectDB()
  .then(() => {

    console.log("✅ DATABASE CONNECTED");

    app.listen(
      PORT,
      '0.0.0.0',
      () => {

        console.log(
          `🚀 Server running on port ${PORT}`
        );

        console.log(
          `📊 Metrics available at http://localhost:${PORT}/metrics`
        );

        console.log(
          `✅ Backend ready for requests`
        );

        console.log(
          "🎉🎉🎉 THIS IS THE NEW DEPLOYED VERSION 🎉🎉🎉"
        );
      }
    );
  })

  .catch(err => {

    console.error(
      '❌ Database connection error:',
      err
    );

    process.exit(1);
  });


// =====================================
// ✅ EXPORTS
// =====================================

module.exports = {
  userRegistrations,
  userLogins,
  httpRequestDuration
};
