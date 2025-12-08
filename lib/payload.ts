import crypto from "crypto";

// กำหนดใน .env: PAYLOAD_SECRET=some-long-random
const SECRET = process.env.PAYLOAD_SECRET || "dev-secret";

export function buildToken(
  studentCode: string,
  courseId: number,
  keyword: string,
  sessionId?: number
) {
  const h = crypto.createHmac("sha256", SECRET);
  // Add sessionId to payload if provided to ensure uniqueness across sessions with same keyword
  const payload = sessionId 
    ? `${studentCode}|${courseId}|${keyword}|${sessionId}`
    : `${studentCode}|${courseId}|${keyword}`;
    
  h.update(payload);
  // จะใช้เต็ม 64 ตัวก็ได้ หรือย่อเหลือ 32 ตัวตามต้องการ
  return h.digest("hex"); // .slice(0, 32)
}
