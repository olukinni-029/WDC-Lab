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
  userId: Types.ObjectId;
  transactionType: TransactionType;
  amount: number;
  description?: string;
  referenceTransactionId?: string;
  responseCode?: string;
  nameEnquiryRef?: string;
  transactionId?: string;
  sessionID?: string;
  fundingMethod?: string;
  status: TransactionStatus;
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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    transactionType: {
      type: String,
      enum: ["credit", "debit", "adjustment"],
      required: true,
    },

    fundingMethod: {
      type: String,
      enum: ["BANK_TRANSFER" , "PAYSTACK_CARD" , "SYSTEM_SYNC" , "MANUAL"],
      default: "",
    },

    amount: {
      type: Number,
      required: true,
    },

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
  },
  {
    timestamps: true,
  },
);

export const WalletTransactionModel = model<IWalletTransaction>(
  "WalletTransaction",
  walletTransactionSchema,
);
