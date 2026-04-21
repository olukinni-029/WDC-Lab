import dotenv from "dotenv";
dotenv.config();
import express, { Express } from "express";
import { createServer } from "http";
import { connectToMongoDB } from "./config/dbConnection";
import logger from "./utils/logger";
import { setupErrorHandlers } from "./middlewares/global_errorHandlers";
import { setupErrorHandling } from "./middlewares/errorhandling_signal_middleware";
import { setupMiddleware } from "./middlewares/setup_middleware";
import walletRouter from "./routes/wallet.routes";
import { blockBot, blockExploits, blockMethods, blockSuspiciousPaths } from "./security";

const app: Express = express();

app.use(express.json());

setupMiddleware(app);
connectToMongoDB();

app.get("/", (_req, res) => {
    res.send("WDC Lab API is live!");
});

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(blockBot)
app.use(blockExploits)
app.use(blockMethods)
app.use(blockSuspiciousPaths)

const httpServer = createServer(app);
app.use("/api/v1", walletRouter);
setupErrorHandlers(app);

const PORT = process.env.PORT || 5000;

const server = httpServer.listen(PORT, () => {
    logger.info(
        `Server is live on http://localhost:${PORT} - ENV: ${process.env.NODE_ENV}`
    );
});

setupErrorHandling(server);

const shutdown = () => {
    server.close(() => {
        logger.info("Server is closed");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { server };
