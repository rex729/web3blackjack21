import prisma from '../db';
import { calculateLevel } from '../utils/levelSystem';

export class UserService {
    /**
     * 登入或註冊使用者 (Google Auth)
     * 如果使用者不存在，將自動建立新帳號並隨機分配頭像
     */
    static async loginOrRegister(email: string, password?: string, name?: string, image?: string) {
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // 自動註冊流程
            // 隨機分配一個頭像
            const randomAvatarId = Math.floor(Math.random() * 8) + 1;
            const avatarPath = `/characters/character_0${randomAvatarId}.png`;

            user = await prisma.user.create({
                data: {
                    email,
                    password, // 測試階段密碼僅明文儲存，正式上線應加密
                    name: name || email.split('@')[0],
                    image: image || avatarPath
                    // balance: 10000 // 初始贈送餘額 (已改由 Schema 預設值處理)
                }
            });
            console.log(`[UserService] New user registered: ${email}`);
        } else {
            // 如果使用者已存在，簡單驗證密碼 (如果不是 Google 登入)
            if (password && user.password !== password) {
                throw new Error("Invalid credentials");
            }
        }

        return user;
    }

    /**
     * 更新使用者餘額
     * @param userId 使用者 ID
     * @param amountChange 變更金額 (正數為增加，負數為減少)
     */
    static async updateBalance(userId: string, amountChange: number) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                balance: {
                    increment: amountChange
                }
            }
        });
    }

    static async getUser(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId }
        });
    }

    /**
     * 增加使用者經驗值 (累積制)
     * @param userId 使用者 ID
     * @param amount 獲得的經驗值
     */
    static async addExperience(userId: string, amount: number) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        const oldLevelInfo = calculateLevel(user.experience);
        const newExperience = user.experience + amount;
        const newLevelInfo = calculateLevel(newExperience);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { experience: newExperience }
        });

        if (newLevelInfo.level > oldLevelInfo.level) {
            console.log(`[UserService] User ${user.email} leveled up: Lv.${oldLevelInfo.level} -> Lv.${newLevelInfo.level}!`);
        }

        return updatedUser;
    }

    // 簡單的記憶體快取 (In-Memory Cache)
    // 結構: { 'balance': { data: [...], expiry: 123456789 }, 'experience': { ... } }
    static cache: Record<string, { data: any[], expiry: number }> = {};
    static cacheTTL = 5000; // 快取時效 5秒 (5000ms)

    /**
     * 取得排行榜資料 (含快取機制)
     * @param type 排序依據: 'balance' (財富榜) | 'experience' (等級榜)
     * @param limit 取前幾名 (預設 50)
     */
    static async getLeaderboard(type: 'balance' | 'experience', limit: number = 50) {
        const now = Date.now();
        const cached = this.cache[type];

        // 1. 檢查快取是否有效
        if (cached && now < cached.expiry) {
            console.log(`[UserService] Leaderboard Cache HIT (${type})`);
            return cached.data;
        }

        // 2. 快取失效或不存在，查詢資料庫
        console.log(`[UserService] Leaderboard DB Query (${type})`);
        const data = await prisma.user.findMany({
            orderBy: {
                [type]: 'desc'
            },
            take: limit,
            select: {
                id: true,
                name: true,
                image: true,
                balance: true,
                experience: true
            }
        });

        // 3. 更新快取
        this.cache[type] = {
            data: data,
            expiry: now + this.cacheTTL
        };

        return data;
    }
}
