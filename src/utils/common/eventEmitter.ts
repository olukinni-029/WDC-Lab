import EventEmitter from "events";
import { restClientWithHeaders } from "./restclient";
import { createPermanentVirtualAccount } from "./parallexCreation";
import { redisClient } from "../redis";
import { WalletService } from "../../services/wallet_service";
import { UserService } from "../../services/user.service";

const emitter = new EventEmitter();

emitter.on(
  "Create_Virtual_Account",
  async ({
    userId,
    firstName,
    lastName,
    middleName,
    publicKey,
    privateKey,
    bankName,
    bankCode,
    phoneNumber
  }) => {
    const payload = {
      userId: userId,
      publicKey,
      privateKey,
      firstName,
      lastName,
      middleName,
      phoneNumber
    };

    const maxRetries = 10;
    let attempt = 0;
    let accountResponse: any;

    while (attempt < maxRetries) {
      attempt++;
      console.log(`🔁 Attempt ${attempt} to create wallet...`);

      try {
        accountResponse = await restClientWithHeaders(
          "post",
          process.env.WALLET_CREATION as string,
          payload,
          {
            "Content-Type": "application/json",
          }
        );

        console.log({ accountResponse });

        // If success and data exists, break retry loop
        if (accountResponse?.success && accountResponse?.data?.data) {
          break;
        }

        // Stop retrying if it's not a timeout issue
        if (
          !accountResponse ||
          accountResponse.message !==
          "External service timed out.. Please try again later."
        ) {
          console.log("❌ Not a timeout error, skipping retry.");
          break;
        }

        console.log("⚠️ Timeout occurred, retrying...");
      } catch (err) {
        console.error("❌ Exception during wallet creation:", err);
      }

      if (attempt < maxRetries) {
        // Optional: small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Final check — if still unsuccessful after retries
    if (!accountResponse?.success || !accountResponse?.data?.data) {
      console.log("🚫 Failed to create account after retries");
      return;
    }

    // Proceed to save account to DB
    const accountData = accountResponse.data.data;
    const fullAccountName = (accountData.accountName || `${firstName} ${lastName} ${middleName ?? ""}`).trim();
    const bankAccountCreation = await WalletService.createAccount({
      userId,
      virtualAccountNumber: accountData.accountNumber,
      virtualAccountName: fullAccountName,
      bankName,
      bankCode
    });

    await UserService.findOneByIdAndUpdate(userId, {
      accountNumber: fullAccountName,
      accountName: accountData.accountNumber,
      bankName: bankAccountCreation.bankName,
    });

    console.log("✅ Bank account created:", bankAccountCreation);//Ask for webhook url
  }
);

emitter.on("process-withdrawal", async ({ withdrawalId }) => {
  try {    const withdrawal = await WalletService.processWithdrawal(withdrawalId);
    console.log("✅ Withdrawal processed:", withdrawal);
  } catch (error) {
    console.error("❌ Error processing withdrawal:", error);
  }
});

export default emitter;
