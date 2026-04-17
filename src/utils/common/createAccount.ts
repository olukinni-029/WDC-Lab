import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const { PARALLEX_BASE_URL, PARALLEX_USER, PARALLEX_PASSWORD, PARALLEX_MERCHANT } = process.env;
console.log(PARALLEX_BASE_URL, PARALLEX_USER, PARALLEX_PASSWORD, PARALLEX_MERCHANT);

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

const makeRequest = async (
    method: string,
    path: string,
    data?: Record<string, unknown>
): Promise<any> => {
    try {


        const authToken = await getToken();

        let pBURL = PARALLEX_BASE_URL
        console.log({ pBURL });
        const response = await axios({
            method,
            url: `${pBURL}${path}`,
            // headers: {
            //     Authorization: `Bearer ${authToken}`,
            //     "Content-Type": "application/json",
            //     // MerchantId: PARALLEX_MERCHANT
            // },
            data,
        });

        console.log({ mmakeRequest: response?.data })

        return response?.data;
    } catch (error) {
        console.log(error)
    }
};


const toBase64 = (text: string): string =>
    Buffer.from(text, 'utf-8').toString('base64');

export const getToken = async (): Promise<string> => {
    try {
        const cachedToken = await getValue("parallex_auth_token");
        console.log({ cachedToken })

        if (cachedToken) {
            console.log("Using cached token");
            return cachedToken;
        }

        console.log("Fetching new token");
        const response = await axios.post(`${PARALLEX_BASE_URL}/VirtualAccountAPI/V1/VirtualAccount/Login`, {
            username: PARALLEX_USER,
            password: toBase64(PARALLEX_PASSWORD),
            MerchantId: PARALLEX_MERCHANT,
        });


        console.log({ response })
        const data = response.data;
        const token = data?.data?.token;

        if (token) {
            await setValue("parallex_auth_token", token, 1800); // 1800 seconds = 30 minutes.
        }

        return token;
    } catch (e: any) {
        console.log(e)
    }
};





export type PermanentVirtualAccountData = {
    userId: string;
    firstName: string;
    lastName: string;
    middleName: string;
    privateKey: string;
    publicKey: string;
    phoneNumber: string;
}



export type CallBackUrlRequest = {
    callBackURL: string,
    webHookType: string
}

export const registerWebHook = async (payload: any): Promise<any> => {
    return makeRequest("POST", "/VirtualAccountAPI/V1/VirtualAccount/AddWebHookURL", payload);
}


export const createPermanentVirtualAccount = async (payload: PermanentVirtualAccountData): Promise<any> => {
    // const isUp = await checkApiHealth();
    // if (!isUp) throw new Error("Parallex API is down. Try again later.");
    const baseUrl = "/api/v1/loanspot/create/wallet"
    const response = await makeRequest("POST", baseUrl, payload);
    console.log({ response });
    return response.data;
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
    return makeRequest("POST", "/VirtualAccount/V1/VirtualAccount/GenerateTimedBasedAccountNumber", payload);
};

export type RequeryTemporaryVirtualAccountData = {
    accountNumber: string;
    referenceId: string;
}

export const requeryTemporaryVirtualAccount = async (payload: RequeryTemporaryVirtualAccountData): Promise<any> => {
    return makeRequest("POST", "/VirtualAccount/V1/VirtualAccount/TemporaryVirtualAccountRequery", payload);
};


export type UpdateVirtualAccountRequest = {
    accountNumber: string;
    oldAccountName: string;
    newAccountFirstName: string;
    newAccountLastName: string;
    newAccountMiddleName: string;
}

export const updateVirtualAccount = async (payload: UpdateVirtualAccountRequest): Promise<any> => {
    return makeRequest("POST", "/VirtualAccount/V1/VirtualAccount/UpdateVirtualAccount", payload);
};


export const getBanks = async (): Promise<any> => {
    return makeRequest("GET", "/VirtualAccount/V1/VirtualAccount/GetBanks", null);
};


export const checkApiHealth = async (): Promise<boolean> => {
    try {
        const response = await makeRequest("GET", "/VirtualAccount/V1/VirtualAccount/GetBanks", null);
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
    return makeRequest("POST", "/VirtualAccount/V1/VirtualAccount/InterTransfer", null);
};