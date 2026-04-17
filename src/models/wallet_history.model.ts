import mongoose from "mongoose";

export interface IWalletHistory {
  userId: string;
  userDetails?: {
    name?: string;
    email?: string;
  };
  walletId?: string;
  walletDetails?: {
    name?: string;
    accountNumber?:string;
  };
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  owner: string;
  transactionId?: string;
  refundType?: string;
  finalStatus?: string;
  status?: string;
  transactionType?: string;
  originatingAccountName?: string;
  originatingAccountNumber?: string;
  channel?: string;
  posReference?: string;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  nameEnquiryRef?: string;
  transferRef?: string;
  metadata?: Record<string, any>;
}

const walletHistorySchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: [
        "INFLOW_REVERSAL",
        "REFUND",
        "INFLOW",
        "WITHDRAWAL",
        "TRANSFER",
        "REFERRAL_EARNING",
        "SUBSCRIPTION",
        "SIGNUP_FEE",
      ],
      default: "INFLOW",
    },
    posReference: {
      type: String,
    },
    finalStatus: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING"],
      default: "SUCCESS",
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
    },
    refundType: { type: String },
    transactionId: { type: String },
    channel: { type: String },
    owner: {
      type: String,
    },
    userId: {
      type: String,
    },
    userDetails: {
      name: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    walletId: {
      type: String,
    },
    walletDetails: {
      name: {
        type: String,
      },
      accountNumber:{
        type:String,
      }
    },
    originatingAccountName: { type: String },
    originatingAccountNumber: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    bankCode: { type: String },
    nameEnquiryRef: { type: String },
    transferRef: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
    },
    balanceAfter: {
      type: Number,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

const WalletHistory = mongoose.model<IWalletHistory>(
  "WalletHistory",
  walletHistorySchema
);

export default WalletHistory;
