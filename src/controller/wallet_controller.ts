import { Request, Response } from "express";
import { WalletService } from "../services/wallet_service";
import asyncHandler from "../utils/common/asyncHandler";
import { errorResponse, successResponse } from "../utils/serverresponse/successresponse";
import { UserService } from "../services/user.service";
import emitter from "../utils/common/eventEmitter";
import { generateRsaKeyPairAsync } from "../utils/common/generateKey";
import logger from "../utils/logger";



export const WalletController = {
    createAccount: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user.id;

        const user = await UserService.findUserById(userId);
        if (!user) {
          return errorResponse(res, "User not found", 404);
        }
    
        const existingAccount = await WalletService.findByUserId(
          userId.toString(),
        );
        if (existingAccount) {
          return successResponse(
            res,
            existingAccount,
            "Parallex account already exists",
          );
        }

        const { publicKey, privateKey } = await generateRsaKeyPairAsync();
    
        emitter.emit("Create_Virtual_Account", {
          userId: user._id,
          firstName: user.firstName,
          lastName: "WDCLAB",
          middleName: user.lastName,
          publicKey,
          privateKey,
          bankName: "Parallex Bank",
          bankCode: "000030",
          phoneNumber: user.phoneNumber
        });
    
        return successResponse(
          res,
          {},
          "Parallex account created and linked successfully",
        );
      }),


    requestWithdrawal: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user.id;
       const {
                amount,
                beneficiaryAccountName,
                beneficiaryAccountNumber,
                destinationInstitutionCode,
                nameEnquiryRef,
                posReference,
            } = req.body;
        const user = await UserService.findUserById(userId);
        if(!user){
            return errorResponse(res, "User not found", 404);
        }
        // 
        const withdrawal = await WalletService.createWithdrawalRequest(user._id.toString(), amount, beneficiaryAccountName,
                beneficiaryAccountNumber,
                destinationInstitutionCode,
                nameEnquiryRef,
                posReference,);
        if(!withdrawal){
            return errorResponse(res, "Withdrawal request failed", 400);
        }

        return successResponse(res, withdrawal, "Withdrawal request submitted");
    }),

    nameEnquiry: asyncHandler(async (req: Request, res: Response) => {
        const { bankCode, accountNumber } = req.body;
console.log("Received name enquiry request:", { bankCode, accountNumber });
        const nameEnquiryResult = await WalletService.performNameEnquiry(
          bankCode,
          accountNumber
        );
        // if (!nameEnquiryResult.success) {
        //   return errorResponse(res, nameEnquiryResult.message, 400);
        // }
          return successResponse(res,nameEnquiryResult, "Name enquiry successful");
      }),

   handleWithdrawalWebhook: asyncHandler(async (req: Request, res: Response) => {

  const signature = req.headers["x-parallex-signature"];

  /**
   * ✅ VERIFY WEBHOOK SOURCE
   */
  if (signature !== process.env.PARALEX_WEBHOOK_SECRET) {

    logger.warn("Invalid webhook signature");

    return errorResponse(res, "Unauthorized webhook source", 401);

  }

  const { transferRef, status, message } = req.body;

  if (!transferRef || !status) {

    logger.warn("Invalid webhook payload:", req.body);

    return errorResponse(
      res,
      "Missing required fields: transferRef, status",
      400
    );

  }

  try {

    const result = await WalletService.processWithdrawalWebhook({
      transferRef,
      status,
      message,
    });

    return successResponse(
      res,
      {
        transferRef,
        processed: true
      },
      "Webhook processed successfully"
    );

  } catch (error) {

    logger.error("Webhook processing error:", error);

    /**
     * Important: still return 200
     * so bank does not retry forever
     */

    return successResponse(
      res,
      {
        transferRef,
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      "Webhook received but processing failed"
    );

  }

}),

creditWalletWebhook: asyncHandler(async (req: Request, res: Response) => {

  const {
    accountNumber,
    amount,
    sessionId,
    originatorName,
    originatorAccountNumber
  } = req.body;

  const result = await WalletService.creditWallet({
    accountNumber,
    amount,
    sessionId,
    originatorName,
    originatorAccountNumber
  });

  return res.status(200).json({
    success: true,
    message: "Webhook processed",
    data: result
  });

})
};