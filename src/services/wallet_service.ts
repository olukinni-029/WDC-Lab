import mongoose from "mongoose";
import { IVirtualWallet, VirtualWalletModel } from "../models/virtual_wallet.model";
import { WalletTransactionModel } from "../models/transaction.model";
import { generateReferenceId } from "../utils/helper";
import WalletHistory, { IWalletHistory } from "../models/wallet_history.model";
import { restClientWithHeaders } from "../utils/common/restclient";
import emitter from "../utils/common/eventEmitter";

interface WalletHistoryFilters {
  owner: string;
  type?: string;
  channel?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class WalletService {


  static async performNameEnquiry(accountNumber: string, bankCode: string) {
  try {
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

    console.log("Name Enquiry Response:", response);

    // if (!response || response.success !== true) {
    //   throw new Error(response?.message || "Name enquiry failed");
    // }

    return response;
  } catch (error: any) {
    console.error("Name Enquiry Error:", error?.message || error);
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
    posReference: string
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

      // Debit wallet immediately
      wallet.availableBalance -= amount;
      wallet.totalBalance -= amount;

      await wallet.save({ session });

      const reference = generateReferenceId(userId);

      const withdrawal = await this.createWalletHistroy(
           {
      userId,
      walletId: wallet._id.toString(),
      owner: userId,
      transactionType: "WITHDRAWAL",
      amount,
      balanceBefore: wallet.availableBalance + amount,
      balanceAfter: wallet.availableBalance,
      status: "pending",
      finalStatus: "PENDING",
      channel: "bank_transfer",
      accountName:beneficiaryAccountName,
      nameEnquiryRef,
      posReference: posReference || "",
      accountNumber: beneficiaryAccountNumber,
      bankCode: destinationInstitutionCode,
      description: "Wallet withdrawal request",
      transactionId: reference
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
            referenceTransactionId: reference,
            status: "pending",
            description: "Wallet withdrawal",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // Push to background worker queue
      await emitter.emit("process-withdrawal", {
        withdrawalId: withdrawal._id,
      });

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

  static async processWithdrawal(withdrawalId: string) {

  const withdrawal = await WalletHistory.findById(withdrawalId);

  if (!withdrawal) {
    throw new Error("Withdrawal not found");
  }



  try {
    const transferResponse: any = await restClientWithHeaders(
      "POST",
      process.env.TRANSFER as string,
      {
        amount: String(withdrawal.amount),
        beneficiaryAccountName:
          withdrawal.accountName,
        beneficiaryAccountNumber: withdrawal.accountNumber,
        destinationInstitutionCode: withdrawal.bankCode,
        nameEnquiryRef: withdrawal.nameEnquiryRef,
        posReference: withdrawal.posReference,
      },
      { "Content-Type": "application/json" }
    );

    if (!transferResponse.success) {
      throw new Error("Transfer failed");
    }

    withdrawal.status = "completed";
    withdrawal.transferRef =
      transferResponse?.data?.response?.requestId;

    await withdrawal.save();

  } catch (error) {

    // Refund wallet if transfer fails

    const wallet = await VirtualWalletModel.findOne({
      userId: withdrawal.userId
    });

    if (wallet) {
      wallet.availableBalance += withdrawal.amount;
      wallet.totalBalance += withdrawal.amount;
      await wallet.save();
    }

    withdrawal.status = "failed";
    await withdrawal.save();
  }
}

  public static async createAccount(accountData: Partial<IVirtualWallet>) {
    return await VirtualWalletModel.create(accountData);
  }

  static async findByUserId(userId: string) {
    const wallet = await VirtualWalletModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!wallet) {
      throw new Error("Virtual wallet not found");
    }
    return wallet;
  }

  public static async createWalletHistroy(
    data: Partial<IWalletHistory>,
    session?: mongoose.ClientSession,
  ) {
    let localSession: mongoose.ClientSession | null = null;

    try {
      // If no session is passed in, start a new one
      if (!session) {
        localSession = await mongoose.startSession();
        localSession.startTransaction();
      }

      const activeSession = session || localSession;

      const history = await WalletHistory.create([{ ...data }], {
        session: activeSession,
      });

      // Commit only if we started our own session
      if (localSession) {
        await localSession.commitTransaction();
      }

      return history[0]; // because .create with array returns an array
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

  public static async fetchWalletHistory(params: WalletHistoryFilters) {
    const { owner, type, channel, status, page = 1, limit = 20 } = params;

    const skip = (page - 1) * limit;

    // Build filters
    const filters: any = { owner };

    if (type) filters.type = type;
    if (channel) filters.channel = channel;
    if (status) filters.finalStatus = status;

    // Query DB
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

  static async processWithdrawalWebhook(payload: {
  transferRef: string;
  status: "success" | "failed" | "pending";
  message?: string;
}) {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const transaction = await WalletTransactionModel.findOne({
      "metadata.transferRef": payload.transferRef
    }).session(session);

    if (!transaction) {
      throw new Error(`Transaction with transferRef ${payload.transferRef} not found`);
    }

    /**
     * ✅ WEBHOOK IDEMPOTENCY
     * Prevent duplicate processing
     */
    if (transaction.status === "completed" || transaction.status === "failed") {

      await session.abortTransaction();

      return {
        success: true,
        message: "Webhook already processed",
        status: transaction.status
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

    /**
     * Update WalletTransaction
     */
    transaction.status = finalStatus;

    if (payload.message) {
      transaction.description = payload.message;
    }

    await transaction.save({ session });

    /**
     * Update WalletHistory
     */

    const walletHistory = await WalletHistory.findOne({
      "metadata.transferRef": payload.transferRef
    }).session(session);

    if (walletHistory) {

      walletHistory.status = finalStatus;
      walletHistory.finalStatus =
        finalStatus === "completed" ? "SUCCESS" :
        finalStatus === "failed" ? "FAILED" : "PENDING";

      if (payload.message) {
        walletHistory.description = payload.message;
      }

      await walletHistory.save({ session });

    }

    /**
     * 🔁 REVERSAL IF TRANSFER FAILED
     */

    if (finalStatus === "failed") {

      const wallet = await VirtualWalletModel
        .findById(walletId)
        .session(session);

      if (!wallet) {
        throw new Error("Wallet not found for reversal");
      }

      const balanceBefore = wallet.availableBalance ?? 0;

      /**
       * ✅ SAFE BALANCE UPDATE
       */

      wallet.availableBalance = (wallet.availableBalance ?? 0) + amount;
      wallet.totalBalance = (wallet.totalBalance ?? 0) + amount;

      await wallet.save({ session });

      /**
       * Create reversal transaction
       */

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
        { session }
      );

      /**
       * Create WalletHistory reversal ledger entry
       */

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
        { session }
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
      originatorAccountNumber
    } = payload;

    // Prevent duplicate credit
    const existing = await WalletHistory.findOne({
      transactionId: sessionId
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      return existing;
    }

    // Find wallet by virtual account
    const wallet = await VirtualWalletModel.findOne({
      accountNumber
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
          description: "Wallet funding via virtual account"
        }
      ],
      { session }
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
}
