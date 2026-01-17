import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import { logger } from './config/logger.js';
// import routes from './routes/v1/index.js';

const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';

// =============================================================================
// 0. Trust Proxy
// =============================================================================
app.set('trust proxy', 1);
app.disable('x-powered-by');

// =============================================================================
// 1. Request ID & Logging Middleware
// =============================================================================
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 500) logger.error('Server Error', logData);
    else if (res.statusCode >= 400) logger.warn('Client Error', logData);
    else if (isDevelopment) logger.info('Request Completed', logData);
  });
  next();
});

// =============================================================================
// 2. Security Configuration
// =============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], 
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Request-ID',
    'ngrok-skip-browser-warning', 'Bypass-Tunnel-Reminder'
  ],
  maxAge: 86400
};

// ✅ هذا السطر يكفي لتفعيل CORS لكل الروابط بما فيها OPTIONS
app.use(cors(corsOptions));

// ❌ تم حذف سطر app.options لأنه يسبب مشاكل مع Express 5 وغير ضروري هنا

app.use(cookieParser());
app.use(compression({ level: 6, threshold: 1024 }));

// =============================================================================
// 3. Body Parsing
// =============================================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: 'Invalid JSON format received',
      requestId: req.id
    });
  }
  next(err);
});

// =============================================================================
// 4. Rate Limiting
// =============================================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  skip: (req) => req.path === '/health'
});

app.use('/api', generalLimiter);

// =============================================================================
// 5. Routes & Endpoints
// =============================================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME
  });
});

// app.use('/api/v1', routes);

// 404 Handler (بدون مسار ليعمل كـ Catch-All)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    requestId: req.id
  });
});

// =============================================================================
// 6. Global Error Handler
// =============================================================================
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  if (err.message === 'Not allowed by CORS') {
    logger.warn(`CORS Blocked: ${req.headers.origin}`);
    return res.status(403).json({
      success: false,
      code: 'CORS_ERROR',
      message: 'Origin not allowed'
    });
  }

  logger.error('Unhandled Exception', {
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    url: req.originalUrl
  });

  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? err.message : 'Something went wrong',
    requestId: req.id,
    ...(isDevelopment && { stack: err.stack })
  });
});

export default app;

/*
 * ==============================================================================
 * 🏭 Application Factory (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file configures the Express application and its middleware stack.
 * It is responsible for "how" requests are handled, but not for "listening"
 * to ports (separation of concerns).
 *
 * 🛡️ Security Architecture:
 * - Trust Proxy: Configured to support reverse proxies (Nginx/Cloudflare) correctly.
 * - Helmet: Hardens HTTP headers (CSP, HSTS, X-Frame-Options).
 * - CORS: Dynamic origin checking based on `CORS_ORIGINS` env variable.
 * - Rate Limiting: Global protection against DDoS and Brute-force attacks.
 *
 * 🧩 Key Middleware:
 * - Request ID: Assigns a unique UUID to every request for tracing.
 * - Logger: Advanced structured logging with duration tracking.
 * - Compression: Gzip compression for faster responses.
 * - Body Parser: Safe JSON parsing with 10MB limits and syntax error handling.
 *
 * 🧪 Testing Strategy:
 * Because `app` is exported without calling `.listen()`, it can be imported
 * by testing libraries (like Supertest) to run integration tests without
 * spawning a real network server.
 */