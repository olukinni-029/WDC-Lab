import { Types } from "mongoose";
import { IWalletTransaction, WalletTransactionModel } from "../models/transaction.model";

interface CreateTransactionDTO {
    walletId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    transactionType: "credit" | "debit" | "adjustment";
    amount: number;
    description?: string;
    referenceTransactionId?: string;
    transactionId?: string;
    sessionID?: string;
    fundingMethod?: "BANK_TRANSFER" | "PAYSTACK_CARD" | "SYSTEM_SYNC" | "MANUAL";
    status?: "pending" | "completed" | "failed" | "reversed" | "cancelled";
    bankResponse?: IWalletTransaction["bankResponse"];
}

export class WalletTransactionService {

    public static async create(payload: Partial<CreateTransactionDTO>) {
        try {
            const tx = await WalletTransactionModel.create({
                walletId: payload.walletId,
                userId: payload.userId,
                transactionType: payload.transactionType,
                amount: payload.amount,
                description: payload.description,
                referenceTransactionId: payload.referenceTransactionId,
                transactionId: payload.transactionId,
                sessionID: payload.sessionID,
                fundingMethod: payload.fundingMethod || "SYSTEM_SYNC",
                status: payload.status || "pending",
                bankResponse: payload.bankResponse || {},
            });

            return tx;
        } catch (err) {
            console.error("Transaction create failed:", err);
            return null;
        }
    }


    public static async updateStatus(
        transactionId: string,
        status: IWalletTransaction["status"],
        responseCode?: string,
    ) {
        return await WalletTransactionModel.findOneAndUpdate(
            { transactionId },
            {
                status,
                responseCode,
            },
            { new: true },
        );
    }


    public static async getByWallet(walletId: string) {
        return await WalletTransactionModel.find({ walletId }).sort({
            createdAt: -1,
        });
    }


    public static async getByUser(userId: string) {
        return await WalletTransactionModel.find({ userId }).sort({
            createdAt: -1,
        });
    }


    public static async findByReference(referenceTransactionId: string) {
        return await WalletTransactionModel.findOne({
            referenceTransactionId,
        });
    }
}
