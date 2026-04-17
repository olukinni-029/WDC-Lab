import { Router } from "express";
import { WalletController } from "../controller/wallet_controller";
import { isAuthenticated } from "../middlewares/Auth";

const walletRouter = Router();

walletRouter.post("/create-account", isAuthenticated, WalletController.createAccount);

walletRouter.post("/request-withdrawal", isAuthenticated, WalletController.requestWithdrawal);

walletRouter.post("/name-enquiry", WalletController.nameEnquiry);

walletRouter.post("/webhook/withdrawal-status", WalletController.handleWithdrawalWebhook);

export default walletRouter;
