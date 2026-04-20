import WalletHistory from "../models/wallet_history.model";

interface CreateWalletHistoryDTO {
    accountNumber: string;
    amount: number;
    transactionType?:
    | "INFLOW_REVERSAL"
    | "REFUND"
    | "INFLOW"
    | "WITHDRAWAL"
    | "TRANSFER"
    | "REFERRAL_EARNING"
    | "SUBSCRIPTION"
    | "SIGNUP_FEE";
    description?: string;
    userId?: string;
    owner?: string;

    originatingAccountName?: string;
    originatingAccountNumber?: string;

    transactionId?: string;
    channel?: string;
    metadata?: Record<string, any>;
}

export class WalletHistoryService {
    public static async createByAccountNumber(
        payload: Partial<CreateWalletHistoryDTO>,
    ) {
        try {
            if (!payload) {
                throw new Error("error creating wallet history");
            }

            const lastRecord = await WalletHistory.findOne({
                accountNumber: payload.accountNumber,
            }).sort({ createdAt: -1 });

            const balanceBefore = lastRecord?.balanceAfter ?? 0;
            const balanceAfter = balanceBefore + payload.amount!;

            const history = await WalletHistory.create({
                accountNumber: payload.accountNumber,

                amount: payload.amount,
                balanceBefore,
                balanceAfter,

                transactionType: payload.transactionType || "INFLOW",
                description: payload.description,

                userId: payload.userId,
                owner: payload.owner,

                transactionId: payload.transactionId,
                channel: payload.channel,

                finalStatus: "SUCCESS",
                status: "completed",

                metadata: payload.metadata,
            });

            return history;
        } catch (err) {
            console.error("WalletHistory create failed:", err);
            return null;
        }
    }

    public static async getByAccountNumber(accountNumber: string) {
        return await WalletHistory.find({ accountNumber }).sort({
            createdAt: -1,
        });
    }
}
