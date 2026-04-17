import { createVerify, generateKeyPair } from 'crypto';
import express, { Request, Response, NextFunction } from "express"
import { publicEncrypt, privateDecrypt, constants } from "crypto";

export function encryptPayloadToSingleField(
  payload: object,
  publicKey: string,
): { data: string } {
  const stringified = JSON.stringify(payload);
  const buffer = Buffer.from(stringified, "utf8");
  const encrypted = publicEncrypt(publicKey, buffer as any);
  return {
    data: encrypted.toString("base64"),
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


export function generateRsaKeyPairAsync(): Promise<{ publicKey: string; privateKey: string }> {
  return new Promise((resolve, reject) => {
    generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          return reject(err);
        }
        resolve({ publicKey, privateKey });
      }
    );
  });
}



// export async function encryptionMiddleware(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   let publicKey = req.headers["publicKey"];
//   const agent = await AgentModel
//     .findOne({ publicKey })
//     .select("publicKey privateKey name email virtualAccountNumber virtualAcccountName")
//     .lean()
//     .exec();


//   if (!agent) {
//     return res
//       .status(403)
//       .json({ message: "Unauthorized or invalid public key", success: false });
//   }

//   console.log("coming from loadnpost========================");
//   console.log({body: req.body});
//   const { data } = req.body;
//   console.log("coming from loadnpost========================");
//   console.log({data});
//   if (!data) {
//     return res
//       .status(400)
//       .json({ message: "Missing encrypted data", success: false });
//   }

//   try {
//     req.body = decryptPayloadFromSingleField(data, agent.privateKey);
//   } catch (error) {
//     console.error("Decryption error:", error);
//     return res
//       .status(400)
//       .json({ message: "Invalid encrypted payload", success: false });
//   }

//   res.locals.encryptResponse = (payload: any) =>
//     encryptPayloadToSingleField(payload, agent.publicKey);

//   next();
// }

