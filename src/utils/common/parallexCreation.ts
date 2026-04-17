import dotenv from "dotenv";
dotenv.config();

const { PARALLEX_BASE_URL, PARALLEX_USER, PARALLEX_PASSWORD, PARALLEX_MERCHANT } = process.env;

import axios from "axios";
import { getValue, setValue } from "../redis";

export type AuthResponse = {
    responseBody: {
        accessToken: string;
        expiresIn: number;
    };
};

export type LoginRequest = {
    username: string;
    password: string;
};

const makeRequestToParallex = async (
    method: string,
    path: string,
    data?: Record<string, unknown>
): Promise<any> => {
    try {


        const authToken = await getToken();

        let pBURL = PARALLEX_BASE_URL;

const response = await axios({
  method,
  url: `${pBURL}${path}`, 
  headers: {
    Authorization: `Bearer ${authToken}`, 
    "Content-Type": "application/json",
    MerchantId: PARALLEX_MERCHANT,
  },
  data,
});


        return response?.data;
    } catch (error) {
        console.log(error)
    }
};


const toBase64 = (text: string): string =>
    Buffer.from(text, 'utf-8').toString('base64');

export const getToken = async (): Promise<string | undefined> => {
    try {
        const cachedToken = await getValue("parallex_auth_token");

        if (cachedToken) {
            console.log("Using cached token");
            return cachedToken;
        }

        console.log("Fetching new token");
        const response = await axios.post(
  `${PARALLEX_BASE_URL}/VirtualAccountAPI/V1/VirtualAccount/Login`,
  {
    username: PARALLEX_USER,
    password: toBase64(PARALLEX_PASSWORD as string || ""),
    MerchantId: PARALLEX_MERCHANT,
  }
);



        const data = response.data;
        const token = data?.data?.token;

        if (token) {
            await setValue("parallex_auth_token", token, 1800); // 1800 seconds = 30 minutes.
        }

        return token;
    } catch (e: any) {
        console.log(e)
        return undefined;
    }
};





export type PermanentVirtualAccountData = {
    middleName: string;
    firstName: string;
    lastName: string;
}



export type CallBackUrlRequest = {
    callBackURL: string,
    webHookType: string
}

export const registerWebHook = async (payload: any): Promise<any> => {
    return makeRequestToParallex("POST", "/VirtualAccountAPI/V1/VirtualAccount/AddWebHookURL", payload);
}


export const createPermanentVirtualAccount = async (payload: PermanentVirtualAccountData): Promise<any> => {
    // const isUp = await checkApiHealth();
    // if (!isUp) throw new Error("Parallex API is down. Try again later.");
    return makeRequestToParallex("POST", "/VirtualAccountAPI/V1/VirtualAccount/GeneratePermanentAccountNumber", payload);
};


export type TemporaryVirtualAccountData = {
    middleName: string;
    firstName: string;
    lastName: string;
    referenceId: string;
    amount: string;
    accountExpiryTimeInMinutes: number;
}


export const createTemporaryVirtualAccount = async (payload: TemporaryVirtualAccountData): Promise<any> => {
    return makeRequestToParallex("POST", "/VirtualAccount/V1/VirtualAccount/GenerateTimedBasedAccountNumber", payload);
};

export type RequeryTemporaryVirtualAccountData = {
    accountNumber: string;
    referenceId: string;
}

export const requeryTemporaryVirtualAccount = async (payload: RequeryTemporaryVirtualAccountData): Promise<any> => {
    return makeRequestToParallex("POST", "/VirtualAccount/V1/VirtualAccount/TemporaryVirtualAccountRequery", payload);
};


export type UpdateVirtualAccountRequest = {
    accountNumber: string;
    oldAccountName: string;
    newAccountFirstName: string;
    newAccountLastName: string;
    newAccountMiddleName: string;
}

export const updateVirtualAccount = async (payload: UpdateVirtualAccountRequest): Promise<any> => {
    return makeRequestToParallex("POST", "/VirtualAccount/V1/VirtualAccount/UpdateVirtualAccount", payload);
};


export const getBanks = async (): Promise<any> => {
return makeRequestToParallex("GET", "/VirtualAccount/V1/VirtualAccount/GetBanks", undefined as any);
};


export const checkApiHealth = async (): Promise<boolean> => {
    try {
        const response = await makeRequestToParallex("GET", "/VirtualAccount/V1/VirtualAccount/GetBanks", undefined as any);
        return !!response; // return true if API responds
    } catch (e) {
        console.log("Parallex API is down or unreachable.");
        return false;
    }
};

export type InterTransferRequest = {
    virtualAccountName: string,
    virtualAccountNumber: string,
    amount: string,
    beneficiaryBankCode: string,
    nameEnquirySessionId: string,
    narration: string,
    beneficiaryAccountNumber: string,
    beneficiaryAccountName: string,
    beneficiaryKYC: string,
    beneficiaryBvn: string,
    beneficiaryBankName: string
}

export const interTransder = async (payload: InterTransferRequest): Promise<any> => {
    return makeRequestToParallex("POST", "/VirtualAccount/V1/VirtualAccount/InterTransfer", payload);
};