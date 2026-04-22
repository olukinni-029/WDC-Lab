import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/serverresponse/successresponse';
import { restClientWithHeaders } from '../utils/common/restclient';

export const checkApiKey = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    let apiKey = req.headers["x-api-key"];
    let merchantId = req.headers["merchant-id"];

    if (!apiKey) {
        return errorResponse(res, "Forbidden- No API key provided FO1", 403);
    }

    if (Array.isArray(apiKey)) {
        apiKey = apiKey[0];
    }

    let url = process.env.SUPPLY_BASE as string + "partners/me";
    const headers = {
        "x-api-key": apiKey,
        "merchant-id": merchantId
    };
    const restCall = await restClientWithHeaders("GET", url, undefined, headers);
    if (!restCall) {
        return errorResponse(res, "Forbidden- Invalid API key FO2", 403);
    }

    const restCallData = restCall?.data?.dataInfo;
    const theMerchantId = restCallData?.merchantId;
    const thePartnerName = restCallData?.name;
    const partnerNameEnv = process.env.PARTNER_NAME_ENV;
    console.log({ theMerchantId, thePartnerName, partnerNameEnv })

    if (partnerNameEnv != thePartnerName)
        return errorResponse(res, "Forbiddent - Invalid API Key F03", 403);

    req.user = restCallData;

    next();
};


