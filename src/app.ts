import dotenv from "dotenv";
dotenv.config();
import { Request, Response, NextFunction } from "express";
import express, { Express } from "express";
import { createServer } from "http";
import { connectToMongoDB } from "./config/dbConnection";
import logger from "./utils/logger";
import { setupErrorHandlers } from "./middlewares/global_errorHandlers";
import { setupErrorHandling } from "./middlewares/errorhandling_signal_middleware";
import { setupMiddleware } from "./middlewares/setup_middleware";
import walletRouter from "./routes/wallet.routes";

const app: Express = express();

app.use(express.json());

setupMiddleware(app);

connectToMongoDB();

app.get("/", (_req, res) => {
    res.send("WDC Lab API is live!");
});

app.set("trust proxy", 1); // Only trust the first proxy

app.disable("x-powered-by");

app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && !req.secure) {
        return res.redirect("https://" + req.headers.host + req.url);
    }
    next();
});
// 🚫 BLOCK: Common Exploits (RCE, LFI, PHPunit, ThinkPHP, etc)
// app.use((req: Request, res: Response, next) => {
//   const suspiciousPatterns = [
//     /^\/t4$/i,
//     /^\/geoip\/?$/i,
//     /^\/1\.php$/i,
//     /^\/password\.php$/i,
//     /^\/systembc\/.*\.php$/i,
//     /^\/upl\.php$/i,
//     /^\/form\.html$/i,
//     /eval-stdin/i,
//     /think\\app\\invokefunction/i,
//     /call_user_func_array/i,
//     /md5\(/i,
//     /config-create/i,
//     /usr\/local\/lib\/php/i,
//   ];

//   const matched = suspiciousPatterns.find((pattern) => pattern.test(req.url));
//   if (matched) {
//     logger.warn(
//       `🚫 Blocked exploit attempt: URL=${req.url}, IP=${req.ip}, UA=${req.get(
//         "user-agent"
//       )}`
//     );
//     return res.status(403).send("Forbidden");
//   }

//   next();
// });

// ❌ Block unknown HTTP methods
app.use((req, res, next) => {
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    if (!allowedMethods.includes(req.method)) {
        return res.status(405).send("Method Not Allowed");
    }
    next();
});

// 🛡 Block malicious User-Agents and local IPs
// app.use((req: Request, res: Response, next) => {
//   const blockedUserAgents = [
//     /curl/i,
//     /wget/i,
//     /python-requests/i,
//     /nikto/i,
//     /nmap/i,
//     /zgrab/i,
//     /sqlmap/i,
//     /masscan/i,
//     /custom-asynchttpclient/i,
//     /libwww/i,
//   ];
//   const blockedIps = ["::ffff:127.0.0.1"];

//   const userAgent = req.get("user-agent") || "";
//   const ip = req.ip || "";

//   if (
//     blockedUserAgents.some((ua) => ua.test(userAgent)) ||
//     blockedIps.includes(ip as string || "")
//   ) {
//     logger.warn(`⛔ Blocked User-Agent/IP: UA=${userAgent}, IP=${ip}`);
//     return res.status(403).send("Access Denied");
//   }

//   next();
// });

// 🧨 Block path or extension scans
// app.use((req, res, next) => {
//   const userAgent = req.get("user-agent") || "";
//   const path = req.path;

//   const blockedAgents = [
//     /curl/i,
//     /wget/i,
//     /nikto/i,
//     /nmap/i,
//     /Expanse/i,
//     /zgrab/i,
//   ];
//   const suspiciousPaths = [
//     /\.env/i,
//     /\.git/i,
//     /php/i,
//     /debug/i,
//     /config/i,
//     /druid/i,
//   ];

//   if (
//     blockedAgents.some((agent) => agent.test(userAgent)) ||
//     suspiciousPaths.some((p) => p.test(path))
//   ) {
//     logger.warn(
//       `🔥 Suspicious pattern detected: UA=${userAgent}, path=${path}`
//     );
//     return res.status(403).send("Forbidden");
//   }

//   next();
// });

// 🔐 Block known bad static paths
// app.use((req, res, next) => {
//   const blockedPaths = [
//     "/.env",
//     "/.env.old",
//     "/.env.example",
//     "/.env.txt",
//     "/.git",
//     "/.git/config",
//     "/php-info.php",
//     "/debug",
//     "/frontend_dev.php",
//     "/_ignition/health-check",
//     "/.circleci/config.yml",
//   ];
//   if (blockedPaths.some((path) => req.path.startsWith(path))) {
//     logger.warn(`🛑 Blocked static file scan: path=${req.path}`);
//     return res.status(403).send("Forbidden");
//   }
//   next();
// });

app.use((req, res, next) => {
    if (req.path.match(/^\/(\.env|\.git|php.*|debug|_ignition)/i)) {
        console.log("==============================vulnerability api called....");
        return res.status(403).send("Forbidden");
    }
    next();
});

// app.use((req, res, next) => {
//   if (req.url.match(/\.(env|git|log|sql|bak)$/i)) {
//     return res.status(403).send("Forbidden");
//   }
//   next();
// });

// app.use((req: Request, res: Response, next: NextFunction) => {
//   const botUserAgents = [
//     /Wanscanner/i,
//     /scannerbot/i,
//     /curl/i,
//     /python/i,
//     /Go-http-client/i,
//     /nmap/i,
//     /masscan/i,
//   ];

//   const userAgent = req.get("User-Agent") || "";
//   if (botUserAgents.some((bot) => bot.test(userAgent))) {
//     console.warn(`Blocked bot request: ${userAgent}`);
//     return res.status(403).send("Forbidden");
//   }

//   next();
// });

const httpServer = createServer(app);
app.use("/api/v1", walletRouter);
setupErrorHandlers(app);

const PORT = process.env.PORT || 5000;

const server = httpServer.listen(PORT, () => {
    logger.info(
        `Server is live on http://localhost:${PORT} - PID: ${process.pid} - ENV: ${process.env.NODE_ENV}`
    );
});

setupErrorHandling(server);

// Graceful shutdown
const shutdown = () => {
    server.close(() => {
        logger.info("Server is closed");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Export for use in event listeners
export { server };
