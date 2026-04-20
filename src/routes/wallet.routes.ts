import { Router } from "express";
import { WalletController } from "../controller/wallet_controller";
import { checkApiKey, isAuthenticated } from "../middlewares/Auth";

const walletRouter = Router();

// walletRouter.post("/register", WalletController.registration);
// walletRouter.post("/login", WalletController.login);

// walletRouter.post("/create-account", isAuthenticated, WalletController.createAccount);
// walletRouter.post("/name-enquiry", WalletController.nameEnquiry);
// walletRouter.get("/virtual-account", isAuthenticated, WalletController.getUservirtualAccount);


walletRouter.post("/signupfee", checkApiKey, WalletController.signUpFee);
walletRouter.post("/webhook", checkApiKey, WalletController.webhook);
walletRouter.post("/request-withdrawal", checkApiKey, WalletController.requestWithdrawal);
walletRouter.post("/webhook/withdrawal-status", WalletController.handleWithdrawalWebhook);
walletRouter.post("/webhook/credit", WalletController.creditWalletWebhook);
walletRouter.get("/transactions", isAuthenticated, WalletController.getAllUserTransactions);
walletRouter.get("/wallet-history", isAuthenticated, WalletController.getAllUserWalletHistory);

export default walletRouter;
