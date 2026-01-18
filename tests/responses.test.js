import { test, describe } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import { sendResponse } from '../src/utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../src/constants/responseCodes.js';
import { emailRule, passwordRule } from '../src/validations/common.js';

describe('📬 Response System & Error Handling Tests', () => {
    const app = express();
    app.use(express.json());
    app.get('/success', (req, res) => {
        req.id = "test-id-123";
        return sendResponse(res, req, HTTP_CODES.OK, RESPONSE_KEYS.OPERATION_SUCCESS, { id: 123, name: "Test User" });
    });
    const testSchema = z.object({
        body: z.object({
            email: emailRule,
            password: passwordRule
        })
    });
    app.post('/validate', validate(testSchema), (req, res) => {
        res.status(200).json({ success: true });
    });
    app.get('/not-found', (req, res) => {
        return sendResponse(res, req, HTTP_CODES.NOT_FOUND, RESPONSE_KEYS.NOT_FOUND);
    });
    app.get('/error', (req, res) => {
        return sendResponse(res, req, HTTP_CODES.INTERNAL_SERVER_ERROR, RESPONSE_KEYS.SERVER_ERROR, null, new Error("Database Bomb!"));
    });
    test('✅ 1. Success Response Structure', async () => {
        const res = await supertest(app).get('/success');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.code, 200);
        assert.strictEqual(res.body.errorCode, 'OPERATION_SUCCESS');
        assert.ok(res.body.data, 'Should have data');
        assert.strictEqual(res.body.data.id, 123);
        assert.ok(res.body.meta.requestId, 'Should include Request ID');
    });

    test('❌ 2. Validation Error (i18n Keys Check)', async () => {
        const res = await supertest(app).post('/validate').send({
            email: "bad@domain", 
            password: "Str@1" 
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.errorCode, 'VALIDATION_ERROR');
        console.log('\n📝 Validation Response Data:', JSON.stringify(res.body.data, null, 2));
        assert.strictEqual(res.body.data.email, 'EMAIL_INVALID');
        assert.strictEqual(res.body.data.password, 'PASSWORD_TOO_SHORT');
    });

    test('🔍 3. Not Found Error (Standard Format)', async () => {
        const res = await supertest(app).get('/not-found');

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.errorCode, 'NOT_FOUND');
        assert.strictEqual(res.body.data, null);
    });

    test('🔥 4. Server Error (Hidden Stack Trace in Prod)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = await supertest(app).get('/error');
        assert.strictEqual(res.status, 500);
        assert.strictEqual(res.body.errorCode, 'SERVER_ERROR');
        assert.strictEqual(res.body.debug, undefined, 'Stack trace should be hidden in production');
        process.env.NODE_ENV = originalEnv;
    });

    test('🐛 5. Server Error (Visible Stack Trace in Dev)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const res = await supertest(app).get('/error');
        assert.ok(res.body.debug, 'Debug info should be present in development');
        assert.strictEqual(res.body.debug.message, 'Database Bomb!');
        process.env.NODE_ENV = originalEnv;
    });

});
