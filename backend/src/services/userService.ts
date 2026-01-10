import prisma from '../db';

export class UserService {
    static async loginOrRegister(email: string, password?: string) {
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Auto-registration
            const randomAvatarId = Math.floor(Math.random() * 8) + 1;
            const avatarPath = `/characters/character_0${randomAvatarId}.png`;

            user = await prisma.user.create({
                data: {
                    email,
                    password, // Plain text for MVP as requested previously
                    name: email.split('@')[0],
                    image: avatarPath,
                    balance: 1000
                }
            });
            console.log(`[UserService] New user registered: ${email}`);
        } else {
            // Check password if exists (simpler check for now)
            if (password && user.password !== password) {
                throw new Error("Invalid credentials");
            }
        }

        return user;
    }

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
