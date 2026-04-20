import { Schema, model } from "mongoose";

export interface IVirtualWallet {
    userId: string;
    virtualAccountNumber?: string;
    virtualAccountName?: string;
    nameEnquiryRef?: string;
    bankName?: string;
    bankCode?: string;
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
    lastTransactionAt?: Date;
}

const virtualWalletSchema = new Schema<IVirtualWallet>({
    userId: { type: String, required: true },
    virtualAccountNumber: { type: String, required: false },
    virtualAccountName: { type: String, required: false },
    nameEnquiryRef: { type: String, required: false },
    bankName: { type: String, required: false },
    bankCode: { type: String, required: false },
    availableBalance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    totalBalance: {
        type: Number,
        default: 0
    },
    lastTransactionAt: { type: Date, required: false },
});

export const VirtualWalletModel = model<IVirtualWallet>("VirtualWallet", virtualWalletSchema);  
