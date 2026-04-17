import axios from "axios";

(async () => {
  try {
    const response = await axios.post(
      "https://d9o8urztf23tc.cloudfront.net/api/v1/partners/nameenquiry",
      {
        accountNumber: "8168623014",
        bankCode: "100004",
      },
      {
        headers: {
          "x-api-key":
            "02e4d8c76fae2e38117bb406a842cce07236e7dced3bc6637780a85a21b4110c",
          "merchant-id": "TFSOQZOMZHT8LCU",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("SUCCESS RESPONSE:", response.data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("AXIOS ERROR STATUS:", error.response?.status);
      console.error("AXIOS ERROR DATA:", error.response?.data);
    } else {
      console.error("UNKNOWN ERROR:", error.message);
    }
  }
})();