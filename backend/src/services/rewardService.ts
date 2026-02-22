import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REWARD_AMOUNT = 10000;
const MAX_DAILY_REWARDS = 3;

export class RewardService {
    /**
     * Get current reward status for a user, handling daily resets
     */
    static async getRewardStatus(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const now = new Date();
        const lastDate = user.lastAdRewardDate;

        // Reset if it's a new day (UTC)
        let isNewDay = false;
        if (!lastDate ||
            lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
            lastDate.getUTCMonth() !== now.getUTCMonth() ||
            lastDate.getUTCDate() !== now.getUTCDate()) {
            isNewDay = true;
        }

        const currentCount = isNewDay ? 0 : user.adRewardCount;

        return {
            adRewardCount: currentCount,
            maxRewards: MAX_DAILY_REWARDS,
            canClaim: currentCount < MAX_DAILY_REWARDS,
            rewardAmount: REWARD_AMOUNT
        };
    }

    /**
     * Claim an ad reward and add chips to balance.
     * Uses Prisma Interactive Transactions to prevent Race Conditions.
     */
    static async claimAdReward(userId: string) {
        // Execute the entire read-check-update process inside a single transaction
        // Use precise parameterized QueryRaw for explicit row-level locking
        return await prisma.$transaction(async (tx) => {
            // 1. Explicitly Lock the specific user row until the end of this transaction.
            const users = await tx.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
            if (!users || users.length === 0) throw new Error('User not found');
            const user = users[0];

            const now = new Date();
            const lastDate = user.lastAdRewardDate;

            let isNewDay = false;
            if (!lastDate ||
                lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
                lastDate.getUTCMonth() !== now.getUTCMonth() ||
                lastDate.getUTCDate() !== now.getUTCDate()) {
                isNewDay = true;
            }

            const currentCount = isNewDay ? 0 : user.adRewardCount;

            // 2. Security Assertions
            if (currentCount >= MAX_DAILY_REWARDS) {
                throw new Error(`Daily reward limit of ${MAX_DAILY_REWARDS} reached.`);
            }

            const newCount = currentCount + 1;

            // 3. Update the database (guaranteed no race condition due to FOR UPDATE lock)
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    balance: { increment: REWARD_AMOUNT },
                    adRewardCount: newCount,
                    lastAdRewardDate: now
                }
            });

            console.log(`[RewardService/Tx] User ${updatedUser.email} claimed ad reward (${newCount}/${MAX_DAILY_REWARDS}). New Balance: ${updatedUser.balance}`);

            return {
                balance: updatedUser.balance,
                adRewardCount: newCount,
                maxRewards: MAX_DAILY_REWARDS,
                canClaim: newCount < MAX_DAILY_REWARDS,
            };
        }, {
            isolationLevel: 'Serializable'
        });
    }
}
