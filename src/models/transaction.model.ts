import { Schema, model, Types, Document } from "mongoose";

export type TransactionStatus =
    | "pending"
    | "completed"
    | "failed"
    | "reversed"
    | "cancelled";

export type TransactionType = "credit" | "debit" | "adjustment";

export interface IWalletTransaction extends Document {
    walletId: Types.ObjectId;
    userId: string;
    transactionType: TransactionType;
    amount: number;
    totalAmount?: number;
    fee: number;
    description?: string;
    referenceTransactionId?: string;
    responseCode?: string;
    nameEnquiryRef?: string;
    transactionId?: string;
    sessionID?: string;
    fundingMethod?: string;
    status: TransactionStatus;
    bankResponse?: {
        responseCode?: string;
        sessionID?: string;
        transactionId?: string;
        channelCode?: number;
        destinationInstitutionCode?: string;
        beneficiaryAccountName?: string;
        beneficiaryAccountNumber?: string;
        beneficiaryKYCLevel?: string;
        beneficiaryBankVerificationNumber?: string;
        originatorAccountName?: string;
        originatorAccountNumber?: string;
        originatorBankVerificationNumber?: string;
        originatorKYCLevel?: string;
        transactionLocation?: string;
        narration?: string;
        paymentReference?: string;
        amount?: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
        },

        userId: {
            type: String,
            required: true,
        },

        transactionType: {
            type: String,
            enum: ["credit", "debit", "adjustment"],
            required: true,
        },

        fundingMethod: {
            type: String,
            enum: ["BANK_TRANSFER", "PAYSTACK_CARD", "SYSTEM_SYNC", "MANUAL"],
            default: "",
        },

        amount: {
            type: Number,
            required: true,
        },

        totalAmount: {
            type: Number,
        },
        fee: { type: Number },
        description: {
            type: String,
        },

        referenceTransactionId: {
            type: String,
        },

        status: {
            type: String,
            enum: ["pending", "completed", "failed", "reversed"],
            default: "pending",
        },
        responseCode: {
            type: String,
        },
        nameEnquiryRef: {
            type: String,
        },
        transactionId: {
            type: String,
        },
        sessionID: {
            type: String,
        },
        bankResponse: {
            responseCode: { type: String },
            sessionID: { type: String },
            transactionId: { type: String },
            channelCode: { type: Number },
            destinationInstitutionCode: { type: String },
            beneficiaryAccountName: { type: String },
            beneficiaryAccountNumber: { type: String },
            beneficiaryKYCLevel: { type: String },
            beneficiaryBankVerificationNumber: { type: String },
            originatorAccountName: { type: String },
            originatorAccountNumber: { type: String },
            originatorBankVerificationNumber: { type: String },
            originatorKYCLevel: { type: String },
            transactionLocation: { type: String },
            narration: { type: String },
            paymentReference: { type: String },
            amount: { type: Number },
        },
    },
    {
        timestamps: true,
    },
);

export const WalletTransactionModel = model<IWalletTransaction>(
    "WalletTransaction",
    walletTransactionSchema,
);
