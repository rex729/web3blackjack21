import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const MISSIONS = {
    STREAK_3: { id: 'streak3', target: 3, reward: 10000, type: 'streak' },
    STREAK_5: { id: 'streak5', target: 5, reward: 20000, type: 'streak' },
    TOTAL_15: { id: 'total15', target: 15, reward: 15000, type: 'total' },
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
                    progress: Math.min(user.maxDailyWinStreak, MISSIONS.STREAK_3.target),
                    isClaimed: !!claimed[MISSIONS.STREAK_3.id],
                    isComplete: user.maxDailyWinStreak >= MISSIONS.STREAK_3.target
                },
                {
                    ...MISSIONS.STREAK_5,
                    progress: Math.min(user.maxDailyWinStreak, MISSIONS.STREAK_5.target),
                    isClaimed: !!claimed[MISSIONS.STREAK_5.id],
                    isComplete: user.maxDailyWinStreak >= MISSIONS.STREAK_5.target
                },
                {
                    ...MISSIONS.TOTAL_15,
                    progress: Math.min(user.dailyTotalWins, MISSIONS.TOTAL_15.target),
                    isClaimed: !!claimed[MISSIONS.TOTAL_15.id],
                    isComplete: user.dailyTotalWins >= MISSIONS.TOTAL_15.target
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
     * Called by the Game Engine to update tracking variables
     */
    static async recordGameResult(userId: string, result: 'win' | 'lose' | 'push') {
        try {
            await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (!user) return;

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
                let claimed = isNewDay ? {} : (user.dailyMissionsClaimed as Record<string, boolean> || {});

                if (result === 'win') {
                    currentWinStreak += 1;
                    dailyTotalWins += 1;
                    if (currentWinStreak > maxDailyWinStreak) {
                        maxDailyWinStreak = currentWinStreak;
                    }
                } else if (result === 'lose') {
                    currentWinStreak = 0;
                }
                // If push, streak is retained but not increased

                await tx.user.update({
                    where: { id: userId },
                    data: {
                        currentWinStreak,
                        maxDailyWinStreak,
                        dailyTotalWins,
                        dailyMissionsClaimed: claimed,
                        lastMissionDate: now
                    }
                });
            });
        } catch (error) {
            console.error('[MissionService] Error recording game result:', error);
        }
    }
}
