import mongoose, { Schema, Document } from "mongoose";

export interface ISystemLog extends Document {
    eventType: string;
    identifier: string;
    userType: "PARTNER" | "SYSTEM" | "ADMIN";
    request?: any;
    response?: any;
    metadata?: any;
    ip?: string;
    status: "SUCCESS" | "FAILED" | "PENDING";
    createdAt: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
    {
        eventType: { type: String, required: true },
        identifier: { type: String, required: true },

        userType: {
            type: String,
            enum: ["PARTNER", "SYSTEM", "ADMIN"],
            default: "SYSTEM",
        },

        request: { type: Schema.Types.Mixed },
        response: { type: Schema.Types.Mixed },
        metadata: { type: Schema.Types.Mixed },

        ip: { type: String },

        status: {
            type: String,
            enum: ["SUCCESS", "FAILED", "PENDING"],
            default: "SUCCESS",
        },
    },
    { timestamps: true },
);

export const SystemLogModel = mongoose.model<ISystemLog>(
    "system_logs",
    SystemLogSchema,
);

