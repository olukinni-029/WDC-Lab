import express from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/serverresponse/successresponse';


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


