import { publicEncrypt, privateDecrypt, constants } from 'crypto';
import { Request, Response } from 'express';
import { Document } from 'mongoose';
import { IUser } from '../../models/user.model';
import { UserService } from '../../services/user.service';


export function encryptPayloadToSingleField(payload: object, publicKey: string): { data: string } {
    const stringified = JSON.stringify(payload);
    const buffer = Buffer.from(stringified, 'utf8');
    const encrypted = publicEncrypt(publicKey, buffer as any);
    return {
        data: encrypted.toString('base64'),
    };
}


export function decryptPayloadFromSingleField(
  data: string,
  privateKey: string,
): any {
  const buffer = Buffer.from(data, "base64");
  const decryptedBuffer = privateDecrypt(privateKey, buffer as any);
  return JSON.parse(decryptedBuffer.toString("utf8"));
}

// (async () => {
//   // Example usage
//   const { generateKeyPairSync } = await import('crypto');
//   const { publicKey, privateKey } = generateKeyPairSync('rsa', {
//       modulusLength: 2048,
//       publicKeyEncoding: {
//           type: 'spki',
//           format: 'pem'
//       },
//       privateKeyEncoding: {
//           type: 'pkcs8',
//           format: 'pem',
//           cipher: 'aes-256-cbc',
//           passphrase: ''
//       }
//   });
//
//   const payload = { message: "Hello, World!" };
//   const encrypted = encryptPayloadToSingleField(payload, publicKey);
//   console.log("Encrypted:", encrypted);
//
//   const decrypted = decryptPayloadFromSingleField(encrypted.data, privateKey);
//   console.log("Decrypted:", decrypted);
// })();
//
//

export async function getPartnerWithKey(
  req: Request,
  res: Response,
): Promise<IUser> {
  const userId = req.user?.id;
  console.log({ userId: userId });
  if (!userId) {
    throw new Error("Unauthorized: User ID not found"); // or custom HTTPError
  }

  const user: IUser | null =
    await UserService.findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.publicKey) {
    throw new Error("User API key not found");
  }

  return user;
}
