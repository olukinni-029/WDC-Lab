import { Router } from "express";
import { WalletController } from "../controller/wallet_controller";
import { checkApiKey } from "../middlewares/auth";
import { schemas, validate } from "../utils/validation";

const walletRouter = Router();

walletRouter.post("/signupfee", checkApiKey,validate(schemas.signUpSchema), WalletController.signUpFee);
walletRouter.post("/webhook", WalletController.webhook);
walletRouter.post("/transfer", checkApiKey, validate(schemas.transferSchema), WalletController.transfer);
walletRouter.post("/transactions", checkApiKey, WalletController.getAllUserTransactions);
walletRouter.post("/wallet-history", checkApiKey, WalletController.getAllUserWalletHistory);
walletRouter.get("/virtual-wallet", checkApiKey, WalletController.getVirtualWallets);
walletRouter.post("/verify", checkApiKey, validate(schemas.verifySchema), WalletController.bvnAndNinVerification);

export default walletRouter;
