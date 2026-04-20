import dotenv from "dotenv";
dotenv.config();
import * as jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateToken = (
    payload: object,
    secret: string,
    expiresIn: jwt.SignOptions["expiresIn"]
) => {
    const token = jwt.sign({ ...payload }, secret, { expiresIn });
    return { token };
};

export const verifyToken = (token: string, secret: string) => {
    return jwt.verify(token, secret);
};

export const random = () => crypto.randomBytes(128).toString("base64");
