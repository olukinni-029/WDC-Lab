import mongoose from "mongoose";
import dotenv from "dotenv";
import { VirtualWalletModel } from "../models/virtual_wallet.model";

dotenv.config();

const wdcMotherAccount = "6004559179";
const wdcName = "WDC Digital Center";

const seeder = async () => {
    try {
        const mongoUri =
            ""
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const existing = await VirtualWalletModel.findOne({
            virtualAccountNumber: wdcMotherAccount,
        });

        if (existing) {
            console.log("Mother account already exists, skipping seed:", existing._id);
            return;
        }

        const wallet = await VirtualWalletModel.create({
            userId: new mongoose.Types.ObjectId().toString(),
            virtualAccountName: wdcName,
            virtualAccountNumber: wdcMotherAccount,
            bankCode: "00030",
            bankName: "Parallex",
            pool: true,
        });

        console.log("Seeded mother account:", wallet);
    } catch (err: any) {
        // 11000 = MongoDB duplicate key error — means another process/run
        // already created this account between our findOne check and create()
        if (err?.code === 11000) {
            console.log("Mother account already exists (caught race condition), skipping.");
        } else {
            console.error("Seeder failed:", err);
            process.exitCode = 1;
        }
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// seeder();
