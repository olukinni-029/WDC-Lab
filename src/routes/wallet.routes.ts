import { Router } from "express";
import { WalletController } from "../controller/wallet_controller";
import { checkApiKey } from "../middlewares/auth";

const walletRouter = Router();

//TODO: add joi validation
walletRouter.post("/signupfee", checkApiKey, WalletController.signUpFee);
walletRouter.post("/webhook", WalletController.webhook);
walletRouter.post("/transfer", checkApiKey, WalletController.transfer);
walletRouter.get("/transactions", checkApiKey, WalletController.getAllUserTransactions);
walletRouter.get("/wallet-history", checkApiKey, WalletController.getAllUserWalletHistory);

export default walletRouter;
