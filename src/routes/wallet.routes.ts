import { Router } from "express";
import { WalletController } from "../controller/wallet_controller";
import { isAuthenticated } from "../middlewares/Auth";

const walletRouter = Router();

walletRouter.post("/register", WalletController.registration);

walletRouter.post("/login", WalletController.login);

walletRouter.post("/create-account", isAuthenticated, WalletController.createAccount);

walletRouter.get("/virtual-account", isAuthenticated, WalletController.getUservirtualAccount);

walletRouter.post("/request-withdrawal", isAuthenticated, WalletController.requestWithdrawal);

walletRouter.post("/name-enquiry", WalletController.nameEnquiry);

walletRouter.post("/webhook/withdrawal-status", WalletController.handleWithdrawalWebhook);

walletRouter.post("/webhook/credit", WalletController.creditWalletWebhook);

walletRouter.get("/transactions", isAuthenticated, WalletController.getAllUserTransactions);

walletRouter.get("/wallet-history", isAuthenticated, WalletController.getAllUserWalletHistory);

export default walletRouter;
