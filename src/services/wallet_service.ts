import mongoose from "mongoose";
import {
    IVirtualWallet,
    VirtualWalletModel,
} from "../models/virtual_wallet.model";
import { WalletTransactionModel } from "../models/transaction.model";
import { generateReferenceId, headers } from "../utils/helper";
import WalletHistory, { IWalletHistory } from "../models/wallet_history.model";
import { restClientWithHeaders } from "../utils/common/restclient";

interface WalletHistoryFilters {
    userId?: string;
    owner: string;
    type?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
}

interface TransactionFilters {
    userId: string;
    transactionType?: string;
    fundingMethod?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export class WalletService {

    public static async updateBalance(accountNumber: string, amount: number, action: "credit" | "debit") {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await VirtualWalletModel.findOne({ virtualAccountNumber: accountNumber }).session(session);
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (action === "debit") {
                if (wallet.availableBalance < amount) {
                    throw new Error("E3 - Insufficient balance");
                }
                wallet.availableBalance -= amount;
            } else if (action === "credit") {
                wallet.availableBalance += amount;
            }

            wallet.lastTransactionAt = new Date();
            await wallet.save({ session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async createWallet(data: Partial<IVirtualWallet>) {
        return await VirtualWalletModel.create(data);
    }

    static async performNameEnquiry(accountNumber: string, bankCode: string) {
        try {
            let url = process.env.SUPPLY_BASE as string + "partners/nameenquiry";
            const response = await restClientWithHeaders(
                "POST",
                url,
                {
                    accountNumber,
                    bankCode,
                },
                headers,
            );

            return response;
        } catch (error: any) {
            throw new Error("Unable to perform name enquiry");
        }
    }
    static async createWithdrawalRequest(
        userId: string,
        amount: number,
        beneficiaryAccountName: string,
        beneficiaryAccountNumber: string,
        destinationInstitutionCode: string,
        nameEnquiryRef: string,
        posReference: string,
    ) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const wallet = await VirtualWalletModel.findOne({
                userId: new mongoose.Types.ObjectId(userId),
            }).session(session);

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (wallet.availableBalance < amount) {
                throw new Error("Insufficient balance");
            }

            wallet.availableBalance -= amount;
            wallet.totalBalance -= amount;

            await wallet.save({ session });

            const reference = generateReferenceId(userId);

            await this.createWalletHistroy(
                {
                    userId,
                    walletId: wallet._id.toString(),
                    owner: userId,
                    transactionType: "WITHDRAWAL",
                    amount,
                    balanceBefore: Number(wallet.availableBalance) + Number(amount),
                    balanceAfter: wallet.availableBalance,
                    status: "pending",
                    finalStatus: "PENDING",
                    channel: "bank_transfer",
                    accountName: beneficiaryAccountName,
                    nameEnquiryRef,
                    posReference: posReference || "",
                    accountNumber: beneficiaryAccountNumber,
                    bankCode: destinationInstitutionCode,
                    description: "Wallet withdrawal request",
                    transactionId: reference,
                },
                session,
            );

            await WalletTransactionModel.create(
                [
                    {
                        walletId: wallet._id,
                        userId,
                        transactionType: "debit",
                        amount,
                        fundingMethod: "BANK_TRANSFER",
                        referenceTransactionId: reference,
                        status: "pending",
                        description: "Wallet withdrawal",
                    },
                ],
                { session },
            );

            await session.commitTransaction();

            return {
                reference,
                status: "pending",
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async processWithdrawal(withdrawal: any) {
        if (!withdrawal) {
            throw new Error("Withdrawal not found");
        }

        try {
            const transferResponse: any = await restClientWithHeaders(
                "POST",
                process.env.TRANSFER as string,
                {
                    amount: String(withdrawal.amount),
                    beneficiaryAccountName: withdrawal.accountName,
                    beneficiaryAccountNumber: withdrawal.accountNumber,
                    destinationInstitutionCode: withdrawal.bankCode,
                    nameEnquiryRef: withdrawal.nameEnquiryRef,
                    posReference: withdrawal.posReference,
                },
                { "Content-Type": "application/json" },
            );

            if (!transferResponse.success) {
                throw new Error("Transfer failed");
            }

            withdrawal.status = "completed";
            withdrawal.transferRef = transferResponse?.data?.response?.requestId;

            await withdrawal.save();

            return withdrawal;
        } catch (error) {

            const wallet = await VirtualWalletModel.findOne({
                userId: withdrawal.userId,
            });

            if (wallet) {
                wallet.availableBalance += withdrawal.amount;
                wallet.totalBalance += withdrawal.amount;
                await wallet.save();
            }

            withdrawal.status = "failed";
            await withdrawal.save();

            return withdrawal;
        }
    }

    public static async createAccount(accountData: Partial<IVirtualWallet>) {
        return await VirtualWalletModel.create(accountData);
    }

    static async findByAccountNumber(accountNumber: string) {
        return await VirtualWalletModel.findOne({ accountNumber });
    }

    static async findByUserId(userId: string) {
        const wallet = await VirtualWalletModel.findOne({
            userId: new mongoose.Types.ObjectId(userId),
        });
        return wallet;
    }

    public static async createWalletHistroy(
        data: Partial<IWalletHistory>,
        session?: mongoose.ClientSession,
    ) {
        let localSession: mongoose.ClientSession | null = null;

        try {

            if (!session) {
                localSession = await mongoose.startSession();
                localSession.startTransaction();
            }

            const activeSession = session || localSession;

            const history = await WalletHistory.create([{ ...data }], {
                session: activeSession,
            });

            if (localSession) {
                await localSession.commitTransaction();
            }

            return history[0];
        } catch (error) {
            if (localSession) {
                await localSession.abortTransaction();
            }
            throw error;
        } finally {
            if (localSession) {
                localSession.endSession();
            }
        }
    }

    public static async fetchWalletHistory(
        params: WalletHistoryFilters | string,
    ) {
        const { owner, type, channel, status, page = 1, limit = 20 } =
            typeof params === "string"
                ? { owner: params }
                : params;

        const skip = (page - 1) * limit;

        const filters: any = { owner };

        if (type) filters.type = type;
        if (channel) filters.channel = channel;
        if (status) filters.finalStatus = status;

        const [history, total] = await Promise.all([
            WalletHistory.find(filters)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletHistory.countDocuments(filters),
        ]);

        return {
            page,
            limit,
            total,
            history,
        };
    }

    static async getUserTransactions(params: TransactionFilters | string) {
        const { userId, transactionType, fundingMethod, status, page = 1, limit = 20 } =
            typeof params === "string"
                ? { userId: params }
                : params;

        if (!userId) {
            throw new Error("User ID is required to fetch transactions");
        }

        const skip = (page - 1) * limit;
        const filters: any = {
            userId: new mongoose.Types.ObjectId(userId),
        };

        if (status) filters.status = status;
        if (transactionType) filters.transactionType = transactionType;
        if (fundingMethod) filters.fundingMethod = fundingMethod;

        const [transactions, total] = await Promise.all([
            WalletTransactionModel.find(filters)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransactionModel.countDocuments(filters),
        ]);

        return {
            page,
            limit,
            total,
            transactions,
        };
    }

    static async processWithdrawalWebhook(payload: {
        transferRef: string;
        status: "success" | "failed" | "pending";
        message?: string;
    }) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await WalletTransactionModel.findOne({
                "metadata.transferRef": payload.transferRef,
            }).session(session);

            if (!transaction) {
                throw new Error(
                    `Transaction with transferRef ${payload.transferRef} not found`,
                );
            }


            if (
                transaction.status === "completed" ||
                transaction.status === "failed"
            ) {
                await session.abortTransaction();

                return {
                    success: true,
                    message: "Webhook already processed",
                    status: transaction.status,
                };
            }

            const userId = transaction.userId;
            const walletId = transaction.walletId;
            const amount = transaction.amount;

            let finalStatus: "completed" | "failed" | "pending" = "pending";

            if (payload.status === "success") {
                finalStatus = "completed";
            }

            if (payload.status === "failed") {
                finalStatus = "failed";
            }


            transaction.status = finalStatus;

            if (payload.message) {
                transaction.description = payload.message;
            }

            await transaction.save({ session });



            const walletHistory = await WalletHistory.findOne({
                "metadata.transferRef": payload.transferRef,
            }).session(session);

            if (walletHistory) {
                walletHistory.status = finalStatus;
                walletHistory.finalStatus =
                    finalStatus === "completed"
                        ? "SUCCESS"
                        : finalStatus === "failed"
                            ? "FAILED"
                            : "PENDING";

                if (payload.message) {
                    walletHistory.description = payload.message;
                }

                await walletHistory.save({ session });
            }



            if (finalStatus === "failed") {
                const wallet =
                    await VirtualWalletModel.findById(walletId).session(session);

                if (!wallet) {
                    throw new Error("Wallet not found for reversal");
                }

                const balanceBefore = wallet.availableBalance ?? 0;



                wallet.availableBalance = (wallet.availableBalance ?? 0) + amount;
                wallet.totalBalance = (wallet.totalBalance ?? 0) + amount;

                await wallet.save({ session });



                await WalletTransactionModel.create(
                    [
                        {
                            walletId,
                            userId,
                            transactionType: "credit",
                            amount,
                            description: `Withdrawal reversal - ${payload.message || "Transfer failed"}`,
                            referenceTransactionId: `REV-${transaction.referenceTransactionId}`,
                            status: "completed",
                            metadata: {
                                originalTransferRef: payload.transferRef,
                                reversalReason: payload.message || "Transfer failed",
                            },
                        },
                    ],
                    { session },
                );

                await WalletHistory.create(
                    [
                        {
                            userId,
                            walletId,
                            owner: userId,
                            transactionType: "INFLOW_REVERSAL",
                            amount,
                            balanceBefore,
                            balanceAfter: wallet.availableBalance,
                            status: "completed",
                            finalStatus: "SUCCESS",
                            channel: "system",
                            description: "Withdrawal reversal",
                            metadata: {
                                originalTransferRef: payload.transferRef,
                                reason: payload.message || "Transfer failed",
                            },
                        },
                    ],
                    { session },
                );
            }

            await session.commitTransaction();

            return {
                success: true,
                transactionId: transaction._id,
                status: finalStatus,
                message: `Withdrawal ${finalStatus}`,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async creditWallet(payload: any) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                accountNumber,
                amount,
                sessionId,
                originatorName,
                originatorAccountNumber,
            } = payload;

            const existing = await WalletHistory.findOne({
                transactionId: sessionId,
            }).session(session);

            if (existing) {
                await session.abortTransaction();
                return existing;
            }

            const wallet = await VirtualWalletModel.findOne({
                accountNumber,
            }).session(session);

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const balanceBefore = wallet.availableBalance ?? 0;

            wallet.availableBalance = balanceBefore + amount;
            wallet.totalBalance = (wallet.totalBalance ?? 0) + amount;

            await wallet.save({ session });

            const history = await WalletHistory.create(
                [
                    {
                        userId: wallet.userId,
                        walletId: wallet._id,
                        owner: wallet.userId,
                        transactionType: "INFLOW",
                        amount,
                        balanceBefore,
                        balanceAfter: wallet.availableBalance,
                        status: "completed",
                        finalStatus: "SUCCESS",
                        channel: "bank_transfer",
                        originatingAccountName: originatorName,
                        originatingAccountNumber: originatorAccountNumber,
                        transactionId: sessionId,
                        description: "Wallet funding via virtual account",
                    },
                ],
                { session },
            );

            await session.commitTransaction();

            return history;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async updateWithdrawalStatus(
        transactionId: string,
        status: "success" | "failed" | "pending",
        transferRef?: string,
    ) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const walletHistory = await WalletHistory.findOne({
                transactionId,
            }).session(session);

            if (!walletHistory) {
                throw new Error(`WalletHistory with transactionId ${transactionId} not found`);
            }

            let finalStatus: "completed" | "failed" | "pending" = "pending";
            if (status === "success") finalStatus = "completed";
            if (status === "failed") finalStatus = "failed";

            walletHistory.status = finalStatus;
            walletHistory.finalStatus = finalStatus === "completed" ? "SUCCESS" : finalStatus === "failed" ? "FAILED" : "PENDING";
            if (transferRef) walletHistory.transferRef = transferRef;
            await walletHistory.save({ session });

            const transaction = await WalletTransactionModel.findOne({
                referenceTransactionId: transactionId,
            }).session(session);
            if (transaction) {
                transaction.status = finalStatus;
                if (transferRef) {
                    transaction.sessionID = transferRef;
                }
                if (transactionId) {
                    transaction.transactionId = transactionId;
                }
                transaction.bankResponse = {
                    ...transaction.bankResponse,
                    transactionId,
                    sessionID: transferRef,
                };
                await transaction.save({ session });
            }

            if (finalStatus === "failed") {
                const wallet = await VirtualWalletModel.findOne({
                    userId: walletHistory.userId,
                }).session(session);
                if (wallet) {
                    wallet.availableBalance += walletHistory.amount;
                    wallet.totalBalance += walletHistory.amount;
                    await wallet.save({ session });
                }
            }

            await session.commitTransaction();
            return { success: true, status: finalStatus };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

}
