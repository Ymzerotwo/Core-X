import express, { Request, Response, NextFunction, Application } from 'express';
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
import { csrfProtection } from './middleware/csrf.middleware.js';
import { sendResponse } from './utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from './constants/responseCodes.js';

const app: Application = express();
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = req.headers['x-request-id'] as string || `req_${uuidv4().split('-')[0]}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
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
    'Content-Type', 'Authorization', 'X-Request-ID', 'x-csrf-token',
    ...(!isProduction ? ['ngrok-skip-browser-warning', 'Bypass-Tunnel-Reminder'] : [])
  ],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-CSRF-Token'],
  maxAge: isProduction ? 86400 : 3600
}));

app.use(compression({ level: 6, threshold: 1024 }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, code: 429, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || '127.0.0.1'),
  skip: (req: Request) => req.path === '/health'
});
app.use('/api', generalLimiter);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(hpp());
app.use(securityMiddleware);
app.use(csrfProtection);
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: process.env.SERVICE_NAME });
});
// app.use('/api/v1', routes);
app.use((req: Request, res: Response) => {
  return sendResponse(res, req, HTTP_CODES.NOT_FOUND, RESPONSE_KEYS.NOT_FOUND);
});
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.message === 'Not allowed by CORS') {
    return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.UNAUTHORIZED_ACCESS);
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return sendResponse(res, req, HTTP_CODES.BAD_REQUEST, RESPONSE_KEYS.VALIDATION_ERROR, null, null, { message: 'Invalid JSON' });
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
 * This file configures the Express application, serving as the central hub where
 * all middleware, security layers, and routes are assembled.
 *
 * ⚙️ How it Works:
 * 1. Security Headers (`Helmet`): Sets strict CSP, HSTS, and Frameguard to prevent XSS/Clickjacking.
 * 2. Traffic Control:
 *    - `cors`: strict origin filtering.
 *    - `rateLimit`: Global throttle (200 requests / 15 mins).
 *    - `hpp`: Protects against HTTP Parameter Pollution.
 * 3. Observability:
 *    - Assigns a unique `req.id` (UUID) to every request.
 *    - Logs request duration and status code on completion.
 * 4. Error Handling: A centralized error middleware catches all crashes and formats them via `sendResponse`.
 *
 * 📂 External Dependencies:
 * - `express`: The web framework.
 * - `helmet`, `cors`, `hpp`: Security standard libraries.
 * - `./middleware/security.middleware.js`: Our custom WAF.
 * - `./middleware/csrf.middleware.js`: CSRF protection.
 *
 * 🔒 Security Features:
 * - **Defense in Depth**: Combines standard headers (Helmet) with custom logic (WAF, CSRF).
 * - **Information Hiding**: Disables `X-Powered-By`; generic error messages in production.
 * - **DoS Protection**: Limits body size (10kb) and request rate to prevent flooding.
 *
 * 🚀 Usage:
 * - Imported by `server.js` to start the HTTP listener.
 */
