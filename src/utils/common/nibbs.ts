import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/serverresponse/successresponse";
import asyncHandler from "./asyncHandler";
import { financialInstitution } from "./payment";
import { getValue, setValue } from "../../utils/redis";



export const nibssFinancialInstitution = asyncHandler(async (req: Request, res: Response) => {
    const redisKey = "financialInstitutions";

    try {
        // Check Redis for cached data
        const cachedData = await getValue(redisKey);
        if (cachedData) {
            return successResponse(res, JSON.parse(cachedData), 'Success (cached)');
        }

        // Fetch data from external source
        const result = await financialInstitution();
        if (!result) return errorResponse(res, 'Failed to fetch financial institutions', 400);

        // Store data in Redis with a 24-hour expiration (86400 seconds)
        await setValue(redisKey, JSON.stringify(result), 86400);

        return successResponse(res, result, 'Success');
    } catch (error) {
        console.error('Error fetching financial institutions:', error);
        return errorResponse(res, 'Internal Server Error', 500);
    }
});