import "dotenv/config"; // 先載入 backend/.env，再讀 process.env

// 本機開發沒設定 JWT_SECRET 時才使用，不能用在正式環境。
const MOCK_JWT_SECRET = "mock-jwt-secret-for-local-dev-only";

export const JWT_SECRET = process.env.JWT_SECRET || MOCK_JWT_SECRET;

if (process.env.NODE_ENV === "production" && JWT_SECRET === MOCK_JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production");
}
