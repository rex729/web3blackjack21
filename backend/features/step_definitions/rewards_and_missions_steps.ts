import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PrismaClient } from '@prisma/client';
import { RewardService } from '../../src/services/rewardService';
import { MissionService } from '../../src/services/missionService';
import { MISSIONS } from '../../src/services/missionService';

const prisma = new PrismaClient();
let currentUser: any;
let lastError: Error | null = null;
let concurrentResults: any[] = [];

Before(async () => {
    // Clear test data before each scenario to isolate state
    await prisma.user.deleteMany({
        where: { email: { contains: 'test.com' } }
    });
    lastError = null;
    concurrentResults = [];
});

After(async () => {
    await prisma.user.deleteMany({
        where: { email: { contains: 'test.com' } }
    });
    await prisma.$disconnect();
});

Given('a user {string} with {int} chips and {int} ad views today', async (email: string, balance: number, adViews: number) => {
    const now = new Date();
    currentUser = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            name: 'Test User',
            balance,
            adRewardCount: adViews,
            lastAdRewardDate: adViews > 0 ? now : null,
            maxDailyWinStreak: 0,
            dailyTotalWins: 0,
        }
    });
});

When('the user concurrently requests {int} ad rewards', async (count: number) => {
    lastError = null;
    concurrentResults = [];
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(
            RewardService.claimAdReward(currentUser.id)
                .then(res => ({ success: true, res }))
                .catch(err => ({ success: false, error: err.message }))
        );
    }
    // Fire all at the same time to force a race condition test
    concurrentResults = await Promise.all(promises);
});

Then('the user should successfully claim the reward at most {int} times', async (maxCount: number) => {
    const successes = concurrentResults.filter(r => r.success).length;
    expect(successes).to.be.at.most(maxCount, `Expected at most ${maxCount} successful claim(s), got ${successes}`);

    // Check balance
    const freshUser = await prisma.user.findUnique({ where: { id: currentUser.id } });
    const actualIncrease = (freshUser?.balance ?? 0) - currentUser.balance;
    expect(actualIncrease).to.equal(successes * 10000, `Balance discrepancy. Claims succeeded: ${successes}, Balance increase: ${actualIncrease}`);
});

Given('a user {string} with {int} ad views today', async (email: string, adViews: number) => {
    const now = new Date();
    currentUser = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            name: 'Test Limit User',
            balance: 10000,
            adRewardCount: adViews,
            lastAdRewardDate: adViews > 0 ? now : null,
            maxDailyWinStreak: 0,
            dailyTotalWins: 0,
        }
    });
});

When('the user requests an ad reward', async () => {
    lastError = null;
    try {
        await RewardService.claimAdReward(currentUser.id);
    } catch (error: any) {
        lastError = error;
    }
});

Then('the claim should fail with the error {string}', (expectedErrorMsg: string) => {
    expect(lastError).not.to.be.null;
    expect(lastError?.message).to.include(expectedErrorMsg);
});

// Missions
Given('a user {string} has completed the {string} mission but not claimed it', async (email: string, missionId: string) => {
    const mission = Object.values(MISSIONS).find(m => m.id === missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    currentUser = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            name: 'Mission Tester',
            balance: 1000,
            currentWinStreak: mission.target,
            maxDailyWinStreak: mission.target,
            dailyTotalWins: mission.target,
            dailyMissionsClaimed: {}, // Not claimed
            lastMissionDate: new Date()
        }
    });
});

When('the user concurrently requests to claim the {string} mission {int} times', async (missionId: string, count: number) => {
    lastError = null;
    concurrentResults = [];
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(
            MissionService.claimMission(currentUser.id, missionId)
                .then(res => ({ success: true }))
                .catch(err => ({ success: false, error: err.message }))
        );
    }
    // Run them in parallel identically
    concurrentResults = await Promise.all(promises);
});

Then('the user should only successfully claim the mission reward {int} time(s)', (expectedCount: number) => {
    const successes = concurrentResults.filter(r => r.success).length;
    expect(successes).to.equal(expectedCount, `Expected exactly ${expectedCount} successful mission claim(s), but got ${successes}`);
});

Then('the user should have received the mission reward chips exactly once', async () => {
    const freshUser = await prisma.user.findUnique({ where: { id: currentUser.id } });
    const rewardFound = Object.values(MISSIONS).find(m => m.id === 'streak3')?.reward || 0;
    const expectedFinalBalance = currentUser.balance + rewardFound;
    expect(freshUser?.balance).to.equal(expectedFinalBalance, "Balance should only reflect a single mission reward");
});

Given('a user {string} has a current win streak of {int}', async (email: string, streak: number) => {
    currentUser = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            name: 'Newbie',
            balance: 500,
            currentWinStreak: streak,
            maxDailyWinStreak: streak,
            dailyMissionsClaimed: {},
            lastMissionDate: new Date()
        }
    });
});

When('the user attempts to claim the {string} mission', async (missionId: string) => {
    lastError = null;
    try {
        await MissionService.claimMission(currentUser.id, missionId);
    } catch (err: any) {
        lastError = err;
    }
});
