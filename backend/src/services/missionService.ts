import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const MISSIONS = {
    STREAK_3: { id: 'streak3', target: 3, reward: 10000, type: 'streak' },
    STREAK_5: { id: 'streak5', target: 5, reward: 20000, type: 'streak' },
    TOTAL_15: { id: 'total15', target: 15, reward: 15000, type: 'total' },
    TOTAL_30: { id: 'total30', target: 30, reward: 30000, type: 'total' },
    FIVE_CARDS: { id: 'fivecards', target: 1, reward: 30000, type: 'special' },
};

export class MissionService {
    /**
     * Get current mission progress for a user, handling daily resets.
     */
    static async getProgress(userId: string) {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const now = new Date();
        const lastDate = user.lastMissionDate;

        let isNewDay = false;
        if (!lastDate ||
            lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
            lastDate.getUTCMonth() !== now.getUTCMonth() ||
            lastDate.getUTCDate() !== now.getUTCDate()) {
            isNewDay = true;
        }

        // If it's a new day, reset their trackers for the day
        if (isNewDay) {
            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    currentWinStreak: 0,
                    maxDailyWinStreak: 0,
                    dailyTotalWins: 0,
                    dailyFiveCardWins: 0,
                    dailyMissionsClaimed: {},
                    lastMissionDate: now
                }
            });
        }

        const claimed = (user.dailyMissionsClaimed as Record<string, boolean>) || {};

        return {
            currentWinStreak: user.currentWinStreak,
            maxDailyWinStreak: user.maxDailyWinStreak,
            dailyTotalWins: user.dailyTotalWins,
            missions: [
                {
                    ...MISSIONS.STREAK_3,
                    progress: Math.min(user.currentWinStreak, MISSIONS.STREAK_3.target),
                    isClaimed: !!claimed[MISSIONS.STREAK_3.id],
                    isComplete: user.maxDailyWinStreak >= MISSIONS.STREAK_3.target
                },
                {
                    ...MISSIONS.STREAK_5,
                    progress: Math.min(user.currentWinStreak, MISSIONS.STREAK_5.target),
                    isClaimed: !!claimed[MISSIONS.STREAK_5.id],
                    isComplete: user.maxDailyWinStreak >= MISSIONS.STREAK_5.target
                },
                {
                    ...MISSIONS.TOTAL_15,
                    progress: Math.min(user.dailyTotalWins, MISSIONS.TOTAL_15.target),
                    isClaimed: !!claimed[MISSIONS.TOTAL_15.id],
                    isComplete: user.dailyTotalWins >= MISSIONS.TOTAL_15.target
                },
                {
                    ...MISSIONS.TOTAL_30,
                    progress: Math.min(user.dailyTotalWins, MISSIONS.TOTAL_30.target),
                    isClaimed: !!claimed[MISSIONS.TOTAL_30.id],
                    isComplete: user.dailyTotalWins >= MISSIONS.TOTAL_30.target
                },
                {
                    ...MISSIONS.FIVE_CARDS,
                    progress: Math.min(user.dailyFiveCardWins, MISSIONS.FIVE_CARDS.target),
                    isClaimed: !!claimed[MISSIONS.FIVE_CARDS.id],
                    isComplete: user.dailyFiveCardWins >= MISSIONS.FIVE_CARDS.target
                }
            ]
        };
    }

    /**
     * Claim completed mission reward using Database transactions preventing abuse.
     */
    static async claimMission(userId: string, missionId: string) {
        return await prisma.$transaction(async (tx) => {
            // 1. Explicitly Lock the user row
            const users = await tx.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
            if (!users || users.length === 0) throw new Error('User not found');
            const user = users[0];

            const mission = Object.values(MISSIONS).find(m => m.id === missionId);
            if (!mission) throw new Error('Invalid mission ID');

            const now = new Date();
            const lastDate = user.lastMissionDate;
            let isNewDay = false;
            if (!lastDate ||
                lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
                lastDate.getUTCMonth() !== now.getUTCMonth() ||
                lastDate.getUTCDate() !== now.getUTCDate()) {
                isNewDay = true;
            }

            if (isNewDay) {
                // If the day turned over while they clicked, missions are reset
                throw new Error('Missions have reset for the day. Please play again.');
            }

            const claimed = (user.dailyMissionsClaimed as Record<string, boolean>) || {};

            if (claimed[missionId]) {
                throw new Error('Mission already claimed today');
            }

            let isComplete = false;
            if (mission.type === 'streak') {
                isComplete = user.maxDailyWinStreak >= mission.target;
            } else if (mission.type === 'total') {
                isComplete = user.dailyTotalWins >= mission.target;
            } else if (mission.type === 'special') {
                if (mission.id === 'fivecards') {
                    isComplete = user.dailyFiveCardWins >= mission.target;
                }
            }

            if (!isComplete) {
                throw new Error('Mission not completed yet');
            }

            // Mark as claimed
            claimed[missionId] = true;

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    balance: { increment: mission.reward },
                    dailyMissionsClaimed: claimed
                }
            });

            console.log(`[MissionService/Tx] User ${updatedUser.email} claimed mission ${missionId}. Reward: ${mission.reward}. New Balance: ${updatedUser.balance}`);

            return {
                balance: updatedUser.balance,
                missionId,
            };
        });
    }

    /**
     * Settle game result: Update mission tracking, balance, and experience in a single transaction.
     */
    static async settleGameResult(userId: string, result: 'win' | 'lose' | 'push', payout: number = 0, xpGained: number = 0, numCards: number = 0) {
        try {
            return await prisma.$transaction(async (tx) => {
                // Use FOR UPDATE to lock the row and prevent race conditions
                const users = await tx.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
                if (!users || users.length === 0) throw new Error('User not found');
                const user = users[0];

                const now = new Date();
                const lastDate = user.lastMissionDate;
                let isNewDay = false;
                if (!lastDate ||
                    lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
                    lastDate.getUTCMonth() !== now.getUTCMonth() ||
                    lastDate.getUTCDate() !== now.getUTCDate()) {
                    isNewDay = true;
                }

                let currentWinStreak = isNewDay ? 0 : user.currentWinStreak;
                let maxDailyWinStreak = isNewDay ? 0 : user.maxDailyWinStreak;
                let dailyTotalWins = isNewDay ? 0 : user.dailyTotalWins;
                let dailyFiveCardWins = isNewDay ? 0 : user.dailyFiveCardWins;
                let claimed = isNewDay ? {} : (user.dailyMissionsClaimed as Record<string, boolean> || {});

                if (result === 'win') {
                    currentWinStreak += 1;
                    dailyTotalWins += 1;
                    if (currentWinStreak > maxDailyWinStreak) {
                        maxDailyWinStreak = currentWinStreak;
                    }
                    if (numCards >= 5) {
                        dailyFiveCardWins += 1;
                    }
                } else if (result === 'lose') {
                    currentWinStreak = 0;
                }
                // If push, streak is retained but not increased

                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        currentWinStreak,
                        maxDailyWinStreak,
                        dailyTotalWins,
                        dailyFiveCardWins,
                        dailyMissionsClaimed: claimed,
                        lastMissionDate: now,
                        balance: { increment: payout },
                        experience: { increment: xpGained }
                    }
                });

                console.log(`[MissionService] Settlement for ${user.email}: ${result}. Payout: ${payout}, XP: +${xpGained}. Streak: ${currentWinStreak}, 5-Card Win: ${numCards >= 5}`);

                return updatedUser;
            });
        } catch (error) {
            console.error('[MissionService] Error settling game result:', error);
            throw error;
        }
    }
}
