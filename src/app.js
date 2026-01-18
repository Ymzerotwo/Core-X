import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { logger } from './config/logger.js';
import { securityMiddleware } from './middleware/security.middleware.js';
import { sendResponse } from './utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from './constants/responseCodes.js';


const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';


app.set('trust proxy', 1);
app.disable('x-powered-by');


app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (req.path === '/health') return;
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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      fontSrc: ["'self'", "data:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, code: 429, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  skip: (req) => req.path === '/health'
});
app.use('/api', generalLimiter);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🚫 CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Request-ID',
    ...(!isProduction ? ['ngrok-skip-browser-warning', 'Bypass-Tunnel-Reminder'] : [])
  ],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: isProduction ? 86400 : 3600
}));


app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(cookieParser());
app.use(compression({ level: 6, threshold: 1024 }));
app.use(securityMiddleware);
app.use(hpp());


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: process.env.SERVICE_NAME });
});

// app.use('/api/v1', routes);


app.use((req, res) => {
  return sendResponse(res, req, HTTP_CODES.NOT_FOUND, RESPONSE_KEYS.NOT_FOUND);
});


app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.UNAUTHORIZED_ACCESS);
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return sendResponse(res, req, HTTP_CODES.BAD_REQUEST, RESPONSE_KEYS.VALIDATION_ERROR, null, { message: 'Invalid JSON' });
  }
  logger.error('Unhandled Exception', {
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    url: req.originalUrl
  });

  return sendResponse(
    res,
    req,
    HTTP_CODES.INTERNAL_SERVER_ERROR,
    RESPONSE_KEYS.SERVER_ERROR,
    null,
    err
  );
});

export default app;

/*
 * ==============================================================================
 * 🏭 Application Factory (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file configures the Express application and its middleware stack.
 *
 * 🛡️ Security Architecture:
 * - Trust Proxy: Configured to support reverse proxies.
 * - Helmet: Hardens HTTP headers.
 * - CORS: Dynamic origin checking.
 * - Rate Limiting: Global protection.
 * - WAF: Custom Security Middleware for Deep Scanning.
 *
 * 🧩 Key Middleware:
 * - Request ID: Unique UUID for tracing.
 * - Logger: Structured logging.
 * - Compression: Gzip.
 * - Body Parser: Safe JSON (50kb limit)
 *
 */