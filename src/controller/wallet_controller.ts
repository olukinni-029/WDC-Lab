import { Request, Response } from "express";
import { WalletService } from "../services/wallet_service";
import asyncHandler from "../utils/common/asyncHandler";
import { errorResponse, successResponse } from "../utils/serverresponse/successresponse";
import { UserService } from "../services/user.service";
import emitter from "../utils/common/eventEmitter";
import { generateRsaKeyPairAsync } from "../utils/common/generateKey";
import logger from "../utils/logger";
import { restClientWithHeaders } from "../utils/common/restclient";
import { maskValue } from "../utils/helper";
import { redisClient } from "../utils/redis";
import { setRefreshTokenCookie, setSessionTokenCookie } from "../utils/hashes/cookies";
import { generateToken } from "../utils/hashes/jwthandler";
import { compare, hash } from "../utils/hashes/hasher";
import { decryptPayloadFromSingleField, encryptPayloadToSingleField, getPartnerWithKey } from "../utils/common/encryptor";



export const WalletController = {
  registration: asyncHandler(
    async (req: Request, res: Response) => {
      const payload = req.body;

      const checkIfExist = await UserService.findByEmail(payload.email);

      if (checkIfExist) {
        return errorResponse(res, "User details already exists", 400);
      }

      const hashedPassword = await hash(payload.password);

      const user = await UserService.createLender({
        ...payload,
        password: hashedPassword,
      });

      const tokenPayload = {
        id: user._id,
        email: payload.email,
        role: "user",
      };

      const accessToken = generateToken(
        tokenPayload,
        process.env.USER_JWT_SECRET! as string,
        "15m"
      );
      setSessionTokenCookie(res, accessToken);
      const refreshToken = generateToken(
        tokenPayload,
        process.env.REFRESH_TOKEN_SECRET! as string,
        "7d"
      );
      setRefreshTokenCookie(res, refreshToken);
      await redisClient.set(`refreshToken:${user._id}`, refreshToken, {
        EX: 7 * 24 * 60 * 60,
      });
      // remove all sensitive lender info
      const userResponse = {
        ...(user.toObject?.() ?? user),
        password: user.password ? maskValue(user.password) : undefined,
      };

      return successResponse(
        res,
        { userResponse,accessToken,refreshToken },
        "User successfully registered"
      );
    }
  ),

  login: asyncHandler(async (req: Request, res: Response) => {
        const { password, email } = req.body;

        const user = await UserService.findByEmail(email);
        if (!user)
            return errorResponse(res, "user email does not exist", 401);

        const isMatch = await compare(password, user.password!);
        if (!isMatch) {
            return errorResponse(res, "invalid email or password", 401);
        }

        const tokenPayload = {
            email,
            id: user._id.toString(),
            role: "user"
        };

        const accessToken = generateToken(
            tokenPayload,
            process.env.USER_JWT_SECRET! as string,
            "1d",
        );

        return successResponse(
            res,
            {
                partner: {
                    id: user._id,
                },
                accessToken
            },
            "login successful",
        );
    }),
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
            lastName: user.lastName,
            companyName:"WDCLAB",
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

    getUservirtualAccount:asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user.id;
        const user = await UserService.findUserById(userId);
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }
        const account = await WalletService.findByUserId(userId.toString());
        if (!account) {
            return errorResponse(res, "Virtual account not found", 404);
        }
        return successResponse(res, account, "Virtual account retrieved successfully");
    }),
    
    nameEnquiry: asyncHandler(async (req: Request, res: Response) => {
        const { bankCode, accountNumber } = req.body;

        const headers = {
            "x-api-key":
                "02e4d8c76fae2e38117bb406a842cce07236e7dced3bc6637780a85a21b4110c",
            "merchant-id": "TFSOQZOMZHT8LCU",
            "Content-Type": "application/json",
        };

        const response = await restClientWithHeaders(
            "POST",
            "https://d9o8urztf23tc.cloudfront.net/api/v1/partners/nameenquiry",
            {
                accountNumber,
                bankCode,
            },
            headers
        );


        return successResponse(res, response.data, "Name enquiry successful");
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
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }
        // 
        const withdrawal = await WalletService.createWithdrawalRequest(user._id.toString(), amount, beneficiaryAccountName,
            beneficiaryAccountNumber,
            destinationInstitutionCode,
            nameEnquiryRef,
            posReference,);
        if (!withdrawal) {
            return errorResponse(res, "Withdrawal request failed", 400);
        }

        return successResponse(res, withdrawal, "Withdrawal request submitted");
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

    }),

    getAllUserWalletHistory: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user.id;
        const user = await UserService.findUserById(userId);
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }
        const walletHistory = await WalletService.fetchWalletHistory({
            owner: userId.toString(),
        });
        return successResponse(res, walletHistory, "User wallet history retrieved successfully");
    }),

    getAllUserTransactions: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user.id;
        const user = await UserService.findUserById(userId);
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }
        const transactions = await WalletService.getUserTransactions({ userId: userId.toString() });
        return successResponse(res, transactions, "User transactions retrieved successfully");
    }),

    transfer: asyncHandler(
    async (req: Request, res: Response) => {
      const user = await getPartnerWithKey(req, res);
      if (!user) return;

      const decryptedData = decryptPayloadFromSingleField(
        req.body.data,
        user.privateKey as any,
      );
      if (!decryptedData) {
        return errorResponse(res, "Failed to encrypt payload", 500);
      }
      const payload = {
        amount: decryptedData.amount,
          beneficiaryAccountName: decryptedData.accountName,
          beneficiaryAccountNumber: decryptedData.accountNumber,
          destinationInstitutionCode: decryptedData.bankCode,
          nameEnquiryRef: decryptedData.nameEnquiryRef,
          posReference: decryptedData.posReference,
      };

      const response = await restClientWithHeaders(
        "POST",
        process.env.TRANSFER as string,
        payload,
      );

      if (!response.success) {
        return errorResponse(
          res,
          response?.message || "Failed to disburse loan",
          400,
        );
      };

      if (!response) return errorResponse(res, "internal error", 500);

      const result = response?.data?.data?.result;
      console.log({ "==========================": result });
      if (!result) {
        return errorResponse(res, "Invalid bank response", 500);
      }

      // Update withdrawal records
      const isSuccess = result.responseCode === "00";
      const status = isSuccess ? "success" : "failed";
      await WalletService.updateWithdrawalStatus(
        result.transactionId,
        status,
        result.sessionID,
      );
            return successResponse(res, { response }, "succes");
    },
  ),

   encryptData: asyncHandler(async (req: Request, res: Response) => {
    const user = await getPartnerWithKey(req, res);
    if (!user) return;
    const response = encryptPayloadToSingleField(req.body, user.publicKey as any);
    return successResponse(res, { response: response.data }, "success");
  }),

};
