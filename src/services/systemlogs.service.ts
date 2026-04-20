
import { SystemLogModel } from "../models/systemlogs.model";

export class LogService {
    public static async createLog(payload: {
        eventType: string;
        identifier: string;
        userType?: "PARTNER" | "SYSTEM" | "ADMIN";
        request?: any;
        response?: any;
        metadata?: any;
        ip?: string;
        status?: "SUCCESS" | "FAILED" | "PENDING";
    }) {
        try {
            const log = await SystemLogModel.create({
                eventType: payload.eventType,
                identifier: payload.identifier,
                userType: payload.userType ?? "SYSTEM",
                request: payload.request,
                response: payload.response,
                metadata: payload.metadata,
                ip: payload.ip,
                status: payload.status ?? "SUCCESS",
            });

            return log;
        } catch (err) {
            console.error("Log creation failed:", err);
            return null;
        }
    }
}
