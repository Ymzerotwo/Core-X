import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { banningService } from '../../services/banning.service.js';
import { sendResponse } from '../../utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../../constants/responseCodes.js';
import { getBanningPage as renderBanningPage } from '../../views/admin/banning.view.js';
import { banItemSchema, unbanItemSchema } from '../../validations/common.js';

export const getBanningPage = (req: ExpressRequest, res: ExpressResponse) => {
    const nonce = Date.now().toString();
    res.send(renderBanningPage(nonce));
};

export const getBans = async (req: ExpressRequest, res: ExpressResponse) => {
    const data = {
        ips: banningService.getBlacklistedIps(),
        users: banningService.getBannedUsers(),
        tokens: banningService.getRevokedTokens()
    };
    return sendResponse(res, req, HTTP_CODES.OK, RESPONSE_KEYS.DATA_RETRIEVED, data);
};

export const banItem = async (req: ExpressRequest, res: ExpressResponse) => {
    const validation = banItemSchema.safeParse(req.body);
    if (!validation.success) {
        const errorMsg = validation.error.issues.map((e: any) => e.message).join(', ');
        return sendResponse(
            res,
            req,
            HTTP_CODES.BAD_REQUEST,
            RESPONSE_KEYS.VALIDATION_ERROR,
            null,
            null,
            { message: errorMsg }
        );
    }
    const { type, value, reason } = validation.data;
    try {
        if (type === 'ip') await banningService.banIp(value, reason || '');
        else if (type === 'user') await banningService.banUser(value, reason || '');
        else if (type === 'token') await banningService.revokeToken(value, reason || '');
        return sendResponse(res, req, HTTP_CODES.OK, RESPONSE_KEYS.OPERATION_SUCCESS);
    } catch (error: any) {
        return sendResponse(res, req, HTTP_CODES.INTERNAL_SERVER_ERROR, RESPONSE_KEYS.SERVER_ERROR, null, null, error);
    }
};

export const unbanItem = async (req: ExpressRequest, res: ExpressResponse) => {
    const validation = unbanItemSchema.safeParse(req.body);
    if (!validation.success) {
        const errorMsg = validation.error.issues.map((e: any) => e.message).join(', ');
        return sendResponse(
            res,
            req,
            HTTP_CODES.BAD_REQUEST,
            RESPONSE_KEYS.VALIDATION_ERROR,
            null,
            null,
            { message: errorMsg }
        );
    }
    const { type, value } = validation.data;
    try {
        if (type === 'ip') await banningService.unbanIp(value);
        else if (type === 'user') await banningService.unbanUser(value);
        else if (type === 'token') await banningService.unrevokeToken(value);

        return sendResponse(res, req, HTTP_CODES.OK, RESPONSE_KEYS.OPERATION_SUCCESS);
    } catch (error: any) {
        return sendResponse(res, req, HTTP_CODES.INTERNAL_SERVER_ERROR, RESPONSE_KEYS.SERVER_ERROR, null, null, error);
    }
};
