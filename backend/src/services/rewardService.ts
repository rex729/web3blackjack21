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
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch user (inside transaction)
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');

            const now = new Date();
            const lastDate = user.lastAdRewardDate;

            // 2. Evaluate if it's a new day
            let isNewDay = false;
            if (!lastDate ||
                lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
                lastDate.getUTCMonth() !== now.getUTCMonth() ||
                lastDate.getUTCDate() !== now.getUTCDate()) {
                isNewDay = true;
            }

            const currentCount = isNewDay ? 0 : user.adRewardCount;

            // 3. Security Assertions (Transaction aborts here if false)
            if (currentCount >= MAX_DAILY_REWARDS) {
                throw new Error(`Daily reward limit of ${MAX_DAILY_REWARDS} reached.`);
            }

            const newCount = currentCount + 1;

            // 4. Atomic Update
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
        });
    }
}
