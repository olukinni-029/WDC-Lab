import axios, { AxiosError } from "axios";
import qs from "qs";
import { getValue, setValue } from "../redis";

const TOKEN_KEY = "nibss_api_token";



async function getToken(): Promise<string | undefined> {
  const url = process.env.NIBSS_RESET_URL_PROD;
  const data = {
    client_id: process.env.NIBBS_CLIENT_ID_PROD,
    scope: process.env.NIBSS_SCOPE_PROD,
    client_secret: process.env.NIBSS_CLIENT_SECRET_PROD,
    grant_type: process.env.NIBSS_CLIENT_GRANT_TYPE_PROD,
    apiKey: process.env.NIBBS_API_KEY_PROD
  };

  try {
    const response = await axios.post(url as string || "", qs.stringify(data), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: process.env.NIBBS_API_KEY_PROD
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
}



const makeRequest = async (
  method: string,
  path: string,
  data?: Record<string, unknown>
): Promise<any> => {
  let authToken = await getValue(TOKEN_KEY); // Try to get token from Redis

  if (!authToken) {
    // Only call API if token is not found in Redis.
    authToken = await getToken() || "";
    await setValue(TOKEN_KEY, authToken as string, 3600); // Store token in Redis for 60 minutes...
  } else {
    console.log({ fromRedis: "redis" });
  }

  try {
    let NIPBASEURL = process.env.NIBSS_BASE_URL_PROD;
    let apiKey = process.env.NIBBS_API_KEY_PROD;

    const response = await axios({
      method,
      url: `${NIPBASEURL}${path}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        apiKey: apiKey,
      },
      data,
    });

    console.log({res: response?.data})
    return response?.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("Response Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: "SUP: " + error.response?.data,
      }
    } else if (error instanceof AxiosError) {
      console.error("Request Error:", error instanceof AxiosError ? error.request : "Unknown error");
    } else {
      console.error("Error Message:", error instanceof Error ? error.message : "Unknown error");
    }
    throw error;
  }
};



export type NameEnquiryRequest = {
  accountNumber: string; //"1780004070"
  channelCode: string; // "1"
  destinationInstitutionCode: string;  //"999998"
  transactionId: string; // "000281250210114559913054960802"
}


export const nameEnquiryRequest = async (payload: NameEnquiryRequest): Promise<any> => {
  return makeRequest("POST", "/v1/nip/nameenquiry", payload);
};


export const financialInstitution = async (): Promise<any> => {
  return makeRequest("GET", "/api/v1/loanspot/financial/institutions", undefined as any);
};

export type BalanceEnquiryRequest = {
  channelCode: string,// "1",
  targetAccountName: string,//"vee Test",
  targetAccountNumber: string,//"0112345678",
  targetBankVerificationNumber: string,//"33333333333",
  authorizationCode: string,//"MA-0112345678-2022315-53097",
  destinationInstitutionCode: string,//"999998",
  billerId: string,//"ADC19BDC-7D3A-4C00-4F7B-08DA06684F59",
  transactionId: string,//"000281250210114559913054960804"
};


export const balanceEnquiry = async (payload: BalanceEnquiryRequest): Promise<any> => {
  return makeRequest("POST", "/v1/nip/balanceenquiry", payload);
};

export type FundTransferRequest = {
  sourceInstitutionCode: string,//"999998", //sourceInstitutionCode: "000281",
  amount: number,// 100,
  beneficiaryAccountName: string, //"Ake Mobolaji Temabo",
  beneficiaryAccountNumber: string, //"1780004070",
  // beneficiaryBankVerificationNumber: number, // 22222222226,
  beneficiaryKYCLevel: number,// 1,
  channelCode: number,// 1,
  originatorAccountName: string,//"vee Test",
  originatorAccountNumber: string,//"0112345678",
  originatorBankVerificationNumber: number,// 33333333333,
  originatorKYCLevel: number,//1,
  destinationInstitutionCode: any,// 999998,
  mandateReferenceNumber: string,//"MA-0112345678-2022315-53097",
  nameEnquiryRef: string,// "999999191106195503191106195503",
  originatorNarration: string,// "Payment from 0112345678 to 1780004070",
  paymentReference: string,//"NIPMINI/999999191106195503191106195503/6015007956/0231116888",
  transactionId: string,//id,
  transactionLocation: string,// "1.38716,3.05117",
  beneficiaryNarration: string,// "Payment to 0112345678 from 1780004070",
  billerId: string,//"ADC19BDC-7D3A-4C00-4F7B-08DA06684F59",
};

export const fundTransfer = async (payload: FundTransferRequest): Promise<any> => {
  return makeRequest("POST", "/v1/nip/fundstransfer", payload);
};





export type RequeryRequest = {
  transactionId: string,
};

export const requeryNibbs = async (payload: RequeryRequest): Promise<any> => {
  return makeRequest("POST", "/v1/nip/tsq", payload);
};


export async function generateTransactionId(clientCode: string) {
  function generateRandomString(length: number) {
    let result = "";
    const characters = "0123456789";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += characters.charAt(randomIndex);
    }

    return result;
  }


 



  function formatDateToYYMMDDHHMMSS(date: any) {
    var year = (date.getFullYear() % 100).toString().padStart(2, "0");
    var month = (date.getMonth() + 1).toString().padStart(2, "0");
    var day = date.getDate().toString().padStart(2, "0");
    var hours = date.getHours().toString().padStart(2, "0");
    var minutes = date.getMinutes().toString().padStart(2, "0");
    var seconds = date.getSeconds().toString().padStart(2, "0");

    return year + month + day + hours + minutes + seconds;
  }

  const randomString = generateRandomString(12);
  const formattedDate = formatDateToYYMMDDHHMMSS(new Date());

  return `${clientCode}${formattedDate}${randomString}`;
}




const clientCode = "119103"// "000281";

function generateRandomString(length: number) {
  let result = "";
  const characters = "0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const randomString = generateRandomString(12);

function formatDateToYYMMDDHHMMSS(date: Date) {
  var year = (date.getFullYear() % 100).toString().padStart(2, "0");
  var month = (date.getMonth() + 1).toString().padStart(2, "0");
  var day = date.getDate().toString().padStart(2, "0");
  var hours = date.getHours().toString().padStart(2, "0");
  var minutes = date.getMinutes().toString().padStart(2, "0");
  var seconds = date.getSeconds().toString().padStart(2, "0");

  return year + month + day + hours + minutes + seconds;
}




// // Example usage:
// var currentDate = new Date();
// var formattedDate = formatDateToYYMMDDHHMMSS(currentDate);
// console.log(formattedDate);

// let id = `${clientCode}${formattedDate}${randomString}`;
// console.log(id);

export function generateTransactionID(): string {
  const currentDate = new Date();
  const formattedDate = formatDateToYYMMDDHHMMSS(currentDate);

  const id = `${clientCode}${formattedDate}${randomString}`;
  return id
}

export function generatePaymentReference(accountNumber: string, bankCode: string): string {
  const prefix = "NIPMINI";
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6-digit random number

  return `${prefix}/${randomDigits}${timestamp}${timestamp}/${accountNumber}/${bankCode}`;
}







// const result = await fundTransfer({
//   sourceInstitutionCode: process.env.SOURCE_INSTITUTION_CODE,
//   amount,
//   beneficiaryAccountName,
//   beneficiaryAccountNumber,
//   beneficiaryKYCLevel: Number(process.env.BENEFICIARY_KYC_LEVEL),
//   channelCode: Number(process.env.CHANNEL_CODE),
//   originatorAccountName: process.env.ORIGNATOR_ACCOUNT_NAME,
//   originatorAccountNumber: process.env.ORIGINATOR_ACCOUNT_NUMBER,
//   originatorBankVerificationNumber: Number(process.env.ORIGINATOR_BANK_VERIFICATION_NUMBER),
//   originatorKYCLevel: Number(process.env.ORIGINATOR_KYC_LEVEL),
//   destinationInstitutionCode,
//   mandateReferenceNumber: process.env.MANDATE_REF,
//   nameEnquiryRef,
//   originatorNarration: `Payment from ${process.env.beneficiaryAccountNumber} to ${process.env.ORIGINATOR_ACCOUNT_NUMBER}`,
//   paymentReference: generatePaymentReference(beneficiaryAccountNumber, destinationInstitutionCode),
//   transactionLocation: process.env.TRANSACTION_LOCATION,
//   beneficiaryNarration: `Payment from ${beneficiaryAccountNumber} to ${process.env.ORIGINATOR_ACCOUNT_NUMBER}`,
//   billerId: process.env.BILLER_ID,
//   transactionId: transactionId
// });



