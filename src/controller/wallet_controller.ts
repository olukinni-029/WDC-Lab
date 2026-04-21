import { Request, Response } from "express";
import { WalletService } from "../services/wallet_service";
import asyncHandler from "../utils/common/asyncHandler";
import { errorResponse, successResponse } from "../utils/serverresponse/successresponse";
import { UserService } from "../services/user.service";
import emitter from "../utils/common/eventEmitter";
import { restClientWithHeaders } from "../utils/common/restclient";
import { LogService } from "../services/systemlogs.service";
import { WalletHistoryService } from "../services/wallethistory.service";
import { WalletTransactionService } from "../services/wallettransaction.service";
import { getPagedAndFilteredData, IPaginationInfo } from "../utils/paginationhandler";
import { WalletTransactionModel } from "../models/transaction.model";
import WalletHistory from "../models/wallet_history.model";
import { encryptPayloadToSingleField, getPartnerWithKey } from "../utils/common/encryptor";
import { generateRsaKeyPairAsync, headers } from "../utils/helper";


export const WalletController = {

    webhook: asyncHandler(async (req: Request, res: Response) => {
        const { eventType, data } = req.body;

        if (!eventType || !data) {
            return res.status(400).send("Invalid payload");
        }

        switch (eventType) {

            case "OUTGOING_PAYMENT_SUCCESS": {
                console.log("========================================>>>>>>>>")
                console.log("========================================>>>>>>>>")
                console.log(eventType)
                console.log(data)
                console.log("========================================>>>>>>>>")
                console.log("========================================>>>>>>>>")

                await LogService.createLog({
                    eventType,
                    identifier: "PARTNER_OUTGOING_TRANSFER",
                    userType: "PARTNER",
                    request: req.body,
                    response: "N/A",
                });

                break;
            }

            case "VIRTUAL_ACCOUNT_CREATE_SUCCESS": {
                const wallet = await WalletService.createWallet({
                    virtualAccountNumber: data?.accountNumber,
                    virtualAccountName: data?.accountName,
                    userId: "WDC-" + data?.accountNumber,
                });

                await LogService.createLog({
                    eventType,
                    identifier: "PARTNER_VA",
                    userType: "PARTNER",
                    request: req.body,
                    response: wallet,
                });

                break;
            }

            case "INFLOW_PAYMENT_SUCCESS": {

                const basePayload = {
                    transactionId: data.referenceID,
                    sessionId: data.sessionId,
                    paymentReference: data.paymentReference,
                    amount: Number(data.amount),
                    beneficiaryAccountNumber: data.beneficiaryAccountNumber,
                    beneficiaryAccountName: data.beneficiaryAccountName,
                    originatingAccountName: data.originatingAccountName,
                    originatingAccountNumber: data.originatingAccountNumber,
                    publishers: data.publishers,
                };

                const updateWallet = await WalletService.updateBalance(
                    data.beneficiaryAccountNumber,
                    basePayload.amount,
                    "credit"
                );

                if (!updateWallet) {
                    await LogService.createLog({
                        eventType,
                        identifier: "INFLOW_WEBHOOK",
                        userType: "SYSTEM",
                        request: req.body,
                        response: basePayload,
                        ip: req.ip,
                        status: "FAILED",
                    });

                    break;
                }

                await Promise.all([
                    LogService.createLog({
                        eventType,
                        identifier: "INFLOW_WEBHOOK",
                        userType: "SYSTEM",
                        request: req.body,
                        response: { received: true },
                        ip: req.ip,
                        status: "SUCCESS",
                    }),

                    WalletHistoryService.createByAccountNumber({
                        accountNumber: data.beneficiaryAccountNumber,
                        amount: basePayload.amount,
                        transactionType: "INFLOW",
                        description: "Inflow payment received",
                        userId: data.userId,
                        owner: "WDC Digital Centre",
                        transactionId: data.referenceID,
                        channel: "INFLOW",
                        metadata: data,
                    }),

                    WalletTransactionService.create({

                        walletId: updateWallet._id,
                        userId: updateWallet.virtualAccountNumber,
                        transactionType: "credit",
                        amount: basePayload.amount,
                        description: "INFLOW",
                        referenceTransactionId: data.sessionId,
                        transactionId: data.referenceID,
                        fundingMethod: "BANK_TRANSFER",
                        status: "completed",
                        bankResponse: {
                            sessionID: data?.sessionID,
                            transactionId: data?.sessionID,
                            destinationInstitutionCode: data?.destinationInstitutionCode,
                            beneficiaryAccountName: data?.beneficiaryAccountName,
                            beneficiaryAccountNumber: data?.beneficiaryAccountNumber,
                            beneficiaryBankVerificationNumber: data?.beneficiaryBankVerificationNumber,
                            originatorAccountName: data?.originatingAccountName,
                            originatorAccountNumber: data?.originatingAccountNumber,
                            amount: data?.amount,
                        }
                    }),
                ]);

                break;
            }

            default:
                console.log("Unhandled event type:", eventType);
        }

        return res.sendStatus(200);
    }),



    // NOTE: on success please change the payment status for the signup fee to true
    signUpFee: asyncHandler(async (req: Request, res: Response) => {
        const url = process.env.SUPPLY_BASE as string + "partners/dynamic/account";
        const { amount, firstName, lastName } = req.body;
        const payload = {
            firstName: firstName + " ." + lastName[0],
            amount,
            lastName: "WDC_SIGNUP_FEE",
        }

        const call = await restClientWithHeaders("POST", url, payload, headers);
        if (!call) return errorResponse(res, "error creating account", 400)

        if (call.data.result.responseCode != "00") {
            return errorResponse(res, "error creating account, please retry", 400)
        }

        const data = call?.data?.result.data;
        return successResponse(res, data, "success")

    }),


    // createAccount: asyncHandler(async (req: Request, res: Response) => {
    //     const userId = req.user.id;
    //
    //     const user = await UserService.findUserById(userId);
    //     if (!user) {
    //         return errorResponse(res, "User not found", 404);
    //     }
    //
    //     const existingAccount = await WalletService.findByUserId(
    //         userId.toString(),
    //     );
    //     if (existingAccount) {
    //         return successResponse(
    //             res,
    //             existingAccount,
    //             "Parallex account already exists",
    //         );
    //     }
    //
    //     const { publicKey, privateKey } = await generateRsaKeyPairAsync();
    //
    //     emitter.emit("Create_Virtual_Account", {
    //         userId: user._id,
    //         firstName: user.firstName,
    //         lastName: user.lastName,
    //         companyName: "WDCLAB",
    //         publicKey,
    //         privateKey,
    //         bankName: "Parallex Bank",
    //         bankCode: "000030",
    //         phoneNumber: user.phoneNumber
    //     });
    //
    //     return successResponse(
    //         res,
    //         {},
    //         "Parallex account created and linked successfully",
    //     );
    // }),
    //
    getUservirtualAccount: asyncHandler(async (req: Request, res: Response) => {
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

    transfer: asyncHandler(async (req: Request, res: Response) => {
        const { originatorAccountNumber, data } = req.body;


        const decrypt = await restClientWithHeaders(
            "POST",
            process.env.SUPPLY_BASE as string + "partners/decrypt",
            {
                data,
            },
            headers
        );


        if (!decrypt.data?.result) {
            return errorResponse(res, "internal error", 404);
        }

        const wallet = await WalletService.findByAccountNumber(originatorAccountNumber);
        if (!wallet) return errorResponse(res, "E0 - wallet not found", 404);

        const fee = 4.5;
        const theAmount = Number(decrypt?.data?.result?.amount);
        const totalAmount = Number(decrypt?.data?.result?.amount) + fee;
        if (!Number.isFinite(theAmount) || theAmount <= 0) return errorResponse(res, "Invalid amount", 400);
        if (theAmount < 1) return errorResponse(res, "Amount must be greater than 0", 400);
        if (Number(wallet.availableBalance) < Number(theAmount)) return errorResponse(res, "insufficient balance", 400);

        const walletUpdate = await WalletService.updateBalance(
            originatorAccountNumber, // this is the customer's account number
            totalAmount,
            "debit",
        );

        if (!walletUpdate) {
            return errorResponse(res, "error updating wallet", 400);
        }

        const url = process.env.SUPPLY_BASE + "partners/transfer";

        const response = await restClientWithHeaders("POST", url, { data }, headers);
        if (response?.success == false) {
            await Promise.all([
                WalletTransactionService.create({
                    totalAmount: totalAmount,
                    fee: fee,
                    amount: theAmount,
                    walletId: wallet._id,
                    userId: originatorAccountNumber,
                    transactionType: "debit",
                    description: "TRANSFER",
                    referenceTransactionId: "N/A",
                    transactionId: "N/A",
                    fundingMethod: "BANK_TRANSFER",
                    status: "failed",
                    bankResponse: {
                    },
                }),

                LogService.createLog({
                    eventType: "OUTWARD_TRANSFER",
                    identifier: "OUTWARD_TRANSFER",
                    userType: "SYSTEM",
                    request: req.body,
                    response: response?.message,
                    ip: req.ip,
                    status: "FAILED",
                })
            ])
            return errorResponse(res, "transfer failed", 400);
        }


        const result = response?.data?.result;

        const [walletTransaction, walletHistory] = await Promise.all([
            WalletTransactionService.create({

                totalAmount: totalAmount,
                fee: fee,
                amount: theAmount,
                walletId: wallet._id,
                userId: originatorAccountNumber,
                transactionType: "debit",
                description: "OUTGOING_TRANSFER",
                referenceTransactionId: result.paymentReference,
                transactionId: result.transactionId,
                fundingMethod: "BANK_TRANSFER",
                status: "completed",
                bankResponse: {
                    responseCode: result.responseCode,
                    sessionID: result.sessionID,
                    transactionId: result.transactionId,
                    channelCode: result.channelCode,
                    destinationInstitutionCode: result.destinationInstitutionCode,
                    beneficiaryAccountName: result.beneficiaryAccountName,
                    beneficiaryAccountNumber: result.beneficiaryAccountNumber,
                    beneficiaryKYCLevel: result.beneficiaryKYCLevel,
                    beneficiaryBankVerificationNumber: result.beneficiaryBankVerificationNumber,
                    originatorAccountName: result.originatorAccountName,
                    originatorAccountNumber: result.originatorAccountNumber,
                    originatorBankVerificationNumber: result.originatorBankVerificationNumber,
                    originatorKYCLevel: result.originatorKYCLevel,
                    transactionLocation: result.transactionLocation,
                    narration: result.narration,
                    paymentReference: result.paymentReference,
                    amount: result.amount,
                },
            }),
            WalletHistoryService.createByAccountNumber({
                accountNumber: originatorAccountNumber,
                amount: theAmount,
                fee: fee,
                transactionType: "TRANSFER",
                description: result?.narration,
                userId: originatorAccountNumber,
                owner: "WDC Digital Centre",
                transactionId: result.transactionId,
                channel: "TRANSFER",
                metadata: response,
            }),
        ])

        return successResponse(res, { walletTransaction }, "Withdrawal request submitted");
    }),

    getAllUserWalletHistory: asyncHandler(async (req: Request, res: Response) => {

        const acccountNumber = req.body.accountNumber;
        const wallet = await WalletService.findByAccountNumber(acccountNumber);

        if (!wallet) {
            return errorResponse(res, "wallet not found", 404);
        }

        const {
            page,
            limit,
        } = req.query;

        const paginationInfo: IPaginationInfo = {
            page: parseInt(page as string, 10) || 1,
            limit: parseInt(limit as string, 10) || 10,
        };

        let filter: { [key: string]: any } = {};
        filter.accountNumber = acccountNumber;

        const result = await getPagedAndFilteredData(
            WalletHistory,
            filter,
            paginationInfo,
        );
        const currentPage = paginationInfo.page;
        const totalPages = Math.ceil(
            result.paginationInfo.total! / paginationInfo.limit,
        );

        const pagedInfo = {
            page: currentPage,
            limit: paginationInfo.limit,
            hasPrevious: currentPage! > 1,
            hasNext: currentPage! < totalPages,
            total: result.paginationInfo.total,
            totalPages,
        };

        return successResponse(
            res,
            { result: result.items, pagedInfo },
            "success",
        );



    }),

    getAllUserTransactions: asyncHandler(async (req: Request, res: Response) => {
        const acccountNumber = req.body.accountNumber;
        const wallet = await WalletService.findByAccountNumber(acccountNumber);

        if (!wallet) {
            return errorResponse(res, "wallet not found", 404);
        }

        const {
            page,
            limit,
        } = req.query;

        const paginationInfo: IPaginationInfo = {
            page: parseInt(page as string, 10) || 1,
            limit: parseInt(limit as string, 10) || 10,
        };

        let filter: { [key: string]: any } = {};
        filter.accountNumber = acccountNumber;

        const result = await getPagedAndFilteredData(
            WalletTransactionModel,
            filter,
            paginationInfo,
        );
        const currentPage = paginationInfo.page;
        const totalPages = Math.ceil(
            result.paginationInfo.total! / paginationInfo.limit,
        );

        const pagedInfo = {
            page: currentPage,
            limit: paginationInfo.limit,
            hasPrevious: currentPage! > 1,
            hasNext: currentPage! < totalPages,
            total: result.paginationInfo.total,
            totalPages,
        };

        return successResponse(
            res,
            { result: result.items, pagedInfo },
            "success",
        );
    }),

    encryptData: asyncHandler(async (req: Request, res: Response) => {
        const user = await getPartnerWithKey(req, res);
        if (!user) return;
        const response = encryptPayloadToSingleField(req.body, user.publicKey as any);
        return successResponse(res, { response: response.data }, "success");
    }),

};
