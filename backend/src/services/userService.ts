import prisma from '../db';

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
                    image: image || avatarPath,
                    balance: 10000 // 初始贈送餘額
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
}
