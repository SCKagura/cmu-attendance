// lib/cmuMobile.ts
export interface CmuVerifyResult {
  email: string;
  name?: string;
  student_id?: string;
  citizen_id?: string;
  it_account?: string;
  it_account_type?: string;
  picture?: string;
  firstname_th?: string;
  firstname_en?: string;
  lastname_th?: string;
  lastname_en?: string;
  organization_name_th?: string;
  organization_name_en?: string;
  // เผื่อมีฟิลด์อื่น ๆ เพิ่มเติม
  [key: string]: unknown;
}

export async function verifyCmuOneTimeToken(
  oneTimeToken: string
): Promise<CmuVerifyResult> {
  const base = process.env.CMU_MOBILE_API_BASE;
  const clientToken = process.env.CMU_MOBILE_CLIENT_TOKEN;

  if (!base || !clientToken) {
    throw new Error("CMU mobile env not configured");
  }

  const url = `${base}/auth/verify_one_time_token?token=${encodeURIComponent(
    oneTimeToken
  )}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`CMU verify failed with status ${res.status}`);
    }

    const response = (await res.json()) as { success: boolean; data: CmuVerifyResult };
    
    // CMU API wraps data in { success: true, data: {...} }
    return response.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
