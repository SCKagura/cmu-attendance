import crypto from "crypto";

// กำหนดใน .env: PAYLOAD_SECRET=some-long-random
const SECRET = process.env.PAYLOAD_SECRET || "dev-secret";

export function buildToken(
  studentCode: string,
  courseId: number,
  keyword: string
) {
  const h = crypto.createHmac("sha256", SECRET);
  h.update(`${studentCode}|${courseId}|${keyword}`);
  // จะใช้เต็ม 64 ตัวก็ได้ หรือย่อเหลือ 32 ตัวตามต้องการ
  return h.digest("hex"); // .slice(0, 32)
}
