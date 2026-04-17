
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';


export interface IBaseResponse {
  status: string;
  success: boolean;
  data?: any;
  message?: string;
}

export interface IWalletResponse extends IBaseResponse {
  userId: string;
  encryptedData: string;
  internalWalletAccountNumber: string;
  wallets: string[];
}


export const restClientWithHeaders = async <T extends IBaseResponse>(
  method: AxiosRequestConfig['method'],
  url: string,
  payload?: object,
  headers?: AxiosRequestConfig['headers'],
): Promise<T> => {
  const config: AxiosRequestConfig = {
    method,
    url,
    headers,
    maxRedirects: 0, 
    transitional: {
      clarifyTimeoutError: true,
    },
    ...(method?.toLowerCase() === 'get' ? { params: payload } : { data: payload }),
  };

  try {
    const response: AxiosResponse = await axios(config);
    return response.data as T;
  } catch (error: any) {
    if (error.response) {
      return error.response.data as T;
    }
    throw error;
  }
};