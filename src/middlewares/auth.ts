import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/serverresponse/successresponse';
import { restClientWithHeaders } from '../utils/common/restclient';

interface CacheEntry {
    data: any;
    expiresAt: number;
}

const partnerCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

const getCacheKey = (apiKey: string, merchantId: string | string[] | undefined): string => {
    return `${apiKey}:${merchantId ?? "no-merchant"}`;
};

const getCachedPartner = (apiKey: string, merchantId: string | string[] | undefined) => {
    const key = getCacheKey(apiKey, merchantId);
    const entry = partnerCache.get(key);

    if (entry && Date.now() < entry.expiresAt) {
        return entry.data;
    }

    // Expired or missing
    partnerCache.delete(key);
    return null;
};

const setCachedPartner = (apiKey: string, merchantId: string | string[] | undefined, data: any) => {
    const key = getCacheKey(apiKey, merchantId);
    partnerCache.set(key, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
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
    let restCallData = getCachedPartner(apiKey, merchantId);
    console.log("****************************************")
    console.dir(restCallData, { depth: null })
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
        setCachedPartner(apiKey, merchantId, restCallData);
    }

    const theMerchantId = restCallData?.merchantId;
    const thePartnerName = restCallData?.name;
    const partnerNameEnv = process.env.PARTNER_NAME_ENV;

    // console.log({ theMerchantId, thePartnerName, partnerNameEnv });
    // console.dir(restCallData, { depth: null });

    if (partnerNameEnv != thePartnerName) {
        console.log({ partnerNameEnv, thePartnerName });
        return errorResponse(res, "Forbidden - Invalid API Key F03", 403);
    }

    req.user = restCallData;
    next();
};

// export const checkApiKey = async (
//     req: express.Request,
//     res: express.Response,
//     next: express.NextFunction,
// ) => {
//     let apiKey = req.headers["x-api-key"];
//     let merchantId = req.headers["merchant-id"];
//
//     if (!apiKey) {
//         return errorResponse(res, "Forbidden- No API key provided FO1", 403);
//     }
//
//     if (Array.isArray(apiKey)) {
//         apiKey = apiKey[0];
//     }
//
//     let url = process.env.SUPPLY_BASE as string + "partners/me";
//     const headers = {
//         "x-api-key": apiKey,
//         "merchant-id": merchantId
//     };
//     const restCall = await restClientWithHeaders("GET", url, undefined, headers);
//     if (!restCall) {
//         return errorResponse(res, "Forbidden- Invalid API key FO2", 403);
//     }
//
//     const restCallData = restCall?.data?.dataInfo;
//     const theMerchantId = restCallData?.merchantId;
//     console.dir(restCallData, {depth: null})
//     const thePartnerName = restCallData?.name;
//     const partnerNameEnv = process.env.PARTNER_NAME_ENV;
//     console.log({ theMerchantId, thePartnerName, partnerNameEnv })
//
//     if (partnerNameEnv != thePartnerName) {
//         console.log({ partnerNameEnv, thePartnerName })
//         return errorResponse(res, "Forbiddent - Invalid API Key F03", 403);
//     }
//
//     req.user = restCallData;
//
//     next();
// };
//
//
