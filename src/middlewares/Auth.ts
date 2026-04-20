import express from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
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


export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        let token: string | undefined;

        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const [scheme, bearerToken] = authHeader.split(' ');
            if (scheme === 'Bearer' && bearerToken) {
                token = bearerToken;
            }
        }

        // Fallback to cookies
        if (!token && req.cookies?.sessionToken) {
            token = req.cookies.sessionToken;
        }

        if (!token) {
            return errorResponse(res, 'Unauthorized: No token provided', 401);
        }

        // Collect the secret
        const secrets = process.env.USER_JWT_SECRET as string;

        let decoded: any | null = null;

        // Try verifying with the secret
        try {
            decoded = jwt.verify(token, secrets) as any;
        } catch (error) {
            return errorResponse(res, 'Unauthorized: Invalid token', 401);
        }

        if (!decoded) {
            return errorResponse(res, 'Unauthorized: Invalid token', 401);
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);

        if (error instanceof TokenExpiredError) {
            return errorResponse(res, 'Unauthorized: Token expired', 401);
        }
        if (error instanceof JsonWebTokenError) {
            return errorResponse(res, 'Unauthorized: Invalid token', 401);
        }
        return errorResponse(res, 'Unauthorized: Token verification failed', 401);
    }
};

// export const authorizeRoles = (allowedRoles: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const userRole = req.user?.role;

//     if (!userRole) {
//       return errorResponse(res, 'Forbidden: No role found', 403);
//     }

//     // Admin always has access
//     if (userRole === 'admin' || allowedRoles.includes(userRole)) {
//       return next();
//     }

//     return errorResponse(res, 'Forbidden: You do not have permission', 403);
//   };
// };


