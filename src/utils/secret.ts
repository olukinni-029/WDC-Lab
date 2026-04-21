import { publicEncrypt, privateDecrypt, constants } from 'crypto';

export function encryptPayloadToSingleField(payload: object, publicKey: string): { data: string } {
    const stringified = JSON.stringify(payload);
    const buffer = Buffer.from(stringified, 'utf8');
    const encrypted = publicEncrypt(publicKey, buffer as any);
    return {
        data: encrypted.toString('base64'),
    };
}
