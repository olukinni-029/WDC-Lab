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

const setCachedPartner = async (
    apiKey: string,
    merchantId: string | string[] | undefined,
    data: any,
) => {
    // Guard: never attempt to cache undefined/null — this was the source
    // of the "arguments[2] must be of type string | Buffer" crash, because
    // JSON.stringify(undefined) returns the literal value `undefined`,
    // not a string, and the Redis client rejects it.
    if (data === undefined || data === null) {
        console.warn(`Skipping Redis cache set for key "${getCacheKey(apiKey, merchantId)}" — no partner data to cache`);
        return;
    }

    const key = getCacheKey(apiKey, merchantId);
    try {
        await setValue(key, JSON.stringify(data), CACHE_TTL_SECONDS);
    } catch (err) {
        // Don't let a cache-write failure break the request — just log it.
        console.error("Error setting value in Redis:", err);
    }
};

export const checkApiKey = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    let apiKey = req.headers["x-api-key"];
    let merchantId = req.headers["merchant-id"];

    if (Array.isArray(apiKey)) {
        apiKey = apiKey[0];
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        return errorResponse(res, "Forbidden - No API key provided FO1", 403);
    }

    // 1. Check cache first
    let restCallData = await getCachedPartner(apiKey, merchantId);

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

        // TEMP DEBUG: uncomment while diagnosing shape mismatches, then remove.
        // console.log("Raw partner API response:", JSON.stringify(restCall, null, 2));

        // Adjust this path once you've confirmed the real response shape.
        console.dir(restCall, {depth: null})
        restCallData = restCall?.data?.dataInfo;

        if (!restCallData || typeof restCallData !== "object") {
            console.error(
                "Unexpected partner API response shape — expected data at restCall.data.dataInfo, got:",
                restCall?.data,
            );
            return errorResponse(res, "Forbidden - Invalid partner data FO2b", 403);
        }

        // 3. Store in cache for 60 minutes (safe no-op if data is falsy)
        await setCachedPartner(apiKey, merchantId, restCallData);
    }

    const thePartnerName = restCallData?.name;
    const partnerNameEnv = process.env.PARTNER_NAME_ENV;

    if (!partnerNameEnv) {
        console.error("PARTNER_NAME_ENV is not set in environment config");
        return errorResponse(res, "Server misconfiguration FO4", 500);
    }

    if (partnerNameEnv !== thePartnerName) {
        console.log("Partner name mismatch:", { partnerNameEnv, thePartnerName });
        return errorResponse(res, "Forbidden - Invalid API Key F03", 403);
    }

    req.user = restCallData;
    next();
};
