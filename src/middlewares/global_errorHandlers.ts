import express, { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/serverresponse/successresponse";
import logger from "../utils/logger";

interface CustomError extends Error {
  status?: number;
  message: string;
}

export const setupErrorHandlers = (app: express.Application): void => {
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(
      `Error: ${err.message} - ${err.stack} - ${req.originalUrl} - ${req.method} - ${req.ip}`
    );

      if (err instanceof Error) {
        return errorResponse(res, err.message, 400);
    }
    next(err);
  }); 

  app.use((req: Request, res: Response, next: NextFunction) => {
    next(errorResponse(res, "Resource Not Found", 404));
  });

  app.use((err: CustomError, req: Request, res: Response) => {
    const status = err.status || 500;
    return errorResponse(res, err.message, status);
  });
};
