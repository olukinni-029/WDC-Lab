import { Request, Response, NextFunction } from "express";
import logger from "./utils/logger";

export const blockMethods = (req: Request, res: Response, next: NextFunction) => {
    const allowed = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    if (!allowed.includes(req.method)) {
        return res.status(405).send("Method Not Allowed");
    }
    next();
};

export const blockSuspiciousPaths = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.path.match(/^\/(\.env|\.git|php.*|debug|_ignition)/i)) {
        logger.warn(`Blocked suspicious path: ${req.path}`);
        return res.status(403).send("Forbidden");
    }
    next();
};

export const blockedPath = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const blockedpaths = [
        "/.env",
        "/.env.old",
        "/.env.example",
        "/.env.txt",
        "/.git",
        "/.git/config",
        "/php-info.php",
        "/debug",
        "/frontend_dev.php",
        "/_ignition/health-check",
        "/.circleci/config.yml",
    ];
    if (blockedpaths.some((path) => req.path.startsWith(path))) {
        logger.warn(`blocked static file scan: path=${req.path}`);
        return res.status(403).send("forbidden");
    }

    next();
};


export const blockBot = (req: Request, res: Response, next: NextFunction) => {
    const botUserAgents = [
        /Wanscanner/i,
        /scannerbot/i,
        /curl/i,
        /python/i,
        /Go-http-client/i,
        /nmap/i,
        /masscan/i,
    ];

    const userAgent = req.get("User-Agent") || "";
    if (botUserAgents.some((bot) => bot.test(userAgent))) {
        console.warn(`Blocked bot request: ${userAgent}`);
        return res.status(403).send("Forbidden");
    }

    next();

}

export const blockExploits = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const patterns = [
        /^\/t4$/i,
        /^\/geoip\/?$/i,
        /eval-stdin/i,
        /think\\app\\invokefunction/i,
        /call_user_func_array/i,
        /md5\(/i,
    ];

    const matched = patterns.find((p) => p.test(req.url));
    if (matched) {
        logger.warn(`Blocked exploit: ${req.url} - IP=${req.ip}`);
        return res.status(403).send("Forbidden");
    }

    next();
};
