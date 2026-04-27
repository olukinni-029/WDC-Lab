import axios from 'axios';

const UVERIF_API_URL = 'https://api.youverify.co/v2/api/identity/ng/bvn';
const UVERIF_API_TOKEN = process.env.YOUVERIFY_API_KEY || "GV3inPFu.GiJH2RtnsVRtbZz5m7ubiljsxAxfBUSdXL3O"; // Use the correct env variable for the token

interface BvnVerificationPayload {
  id: string; // BVN
  isSubjectConsent: boolean;
  validation?: {
    data?: {
      lastName?: string;
      firstName?: string;
      dateOfBirth?: string;
      mobile?:string;
      
    };
    selfie?: {
      image?: string; // Base64 encoded image
    };
  };
  shouldRetrivedNin?: boolean;
  metadata?: Record<string, any>;
  premiumBVN?: boolean;
}

export const bvnVerification = async (bvn: string) => {
  try {
    const payload: BvnVerificationPayload = {
      id: bvn,
      isSubjectConsent: true,
    };

    const response = await axios.post(
      UVERIF_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          token: UVERIF_API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error verifying BVN:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'BVN verification failed',
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
    };
  }
};

// // Example usage
// (async () => {
//   const bvn = '22330640183'; // Replace with actual BVN
//   try {
//     const result = await bvnVerification(bvn);
//     console.log('BVN Verification Result:', result);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// })();