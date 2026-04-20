import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import logger from "../utils/logger";

dotenv.config();

// replace your client/service url here
const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL].filter(
    Boolean,
);

export const setupMiddleware = (app: express.Application): void => {
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
        }),
    );
    app.use((req: Request, res: Response, next) => {
        logger.info(
            `Request URL: ${req.url} - Method: ${req.method} - IP: ${req.ip} - ${req.get("user-agent")}`,
        );
        next();
    });
    app.disable("x-powered-by");

    app.use(cookieParser());
    app.use(express.json());
    app.use(helmet());
    app.use(express.static("public"));
    app.use(express.urlencoded({ extended: true }));
    app.use(
        compression({
            level: 6,
            threshold: 100 * 100,
            filter: (req: Request, res: Response) => {
                if (req.headers["x-no-compression"]) {
                    return false;
                }
                return compression.filter(req, res);
            },
        }),
    );

};
