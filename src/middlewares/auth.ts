

import express from 'express';
import { errorResponse } from '../utils/serverresponse/successresponse';
import { restClientWithHeaders } from '../utils/common/restclient';
import { getValue, setValue } from '../utils/redisclient';

const CACHE_TTL_SECONDS = 60 * 60; // 60 minutes

const getCacheKey = (apiKey: string, merchantId: string | string[] | undefined): string => {
    return `partner-cache:${apiKey}:${merchantId ?? "no-merchant"}`;
};

const getCachedPartner = async (apiKey: string, merchantId: string | string[] | undefined) => {
    const key = getCacheKey(apiKey, merchantId);
    const raw = await getValue(key);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error parsing cached partner data from Redis:", err);
        return null;
    }
};

const setCachedPartner = async (apiKey: string, merchantId: string | string[] | undefined, data: any) => {
    const key = getCacheKey(apiKey, merchantId);
    await setValue(key, JSON.stringify(data), CACHE_TTL_SECONDS);
};

export const checkApiKey = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    let apiKey = req.headers["x-api-key"];
    let merchantId = req.headers["merchant-id"];

    if (!apiKey) {
        return errorResponse(res, "Forbidden - No API key provided FO1", 403);
    }

    if (Array.isArray(apiKey)) {
        apiKey = apiKey[0];
    }

    // 1. Check cache first
    let restCallData = await getCachedPartner(apiKey, merchantId);
    console.log("****************************************")
    // console.dir(restCallData, { depth: null })
    console.log("****************************************")

    if (!restCallData) {
        // 2. Cache miss — call the API
        const url = (process.env.SUPPLY_BASE as string) + "partners/me";
        const headers = {
            "x-api-key": apiKey,
            "merchant-id": merchantId,
        };

        const restCall = await restClientWithHeaders("GET", url, undefined, headers);

        if (!restCall) {
            return errorResponse(res, "Forbidden - Invalid API key FO2", 403);
        }

        restCallData = restCall?.data?.dataInfo;

        // 3. Store in cache for 60 minutes
        await setCachedPartner(apiKey, merchantId, restCallData);
    }

    const theMerchantId = restCallData?.merchantId;
    const thePartnerName = restCallData?.name;
    const partnerNameEnv = process.env.PARTNER_NAME_ENV;

    if (partnerNameEnv != thePartnerName) {
        console.log({ partnerNameEnv, thePartnerName });
        return errorResponse(res, "Forbidden - Invalid API Key F03", 403);
    }

    req.user = restCallData;
    next();
};
