import { Given, When, Then, AfterAll, BeforeAll } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import prisma from '../../src/db';
import { UserService } from '../../src/services/userService';

// 測試用的資料暫存
let leaderboardResult: any[] = [];

// 在所有測試開始前，清空資料庫 (可選，視需求而定)
// 這裡我們選擇在 Scenario 開始前清空 User 表，確保環境乾淨
// 注意：這會刪除 dev.db 的資料，開發環境請小心
Given('the following users exist:', async function (dataTable) {
    // 1. 清空 User 表 (為了測試準確性)
    try {
        await prisma.user.deleteMany({});
    } catch (e) {
        console.log("Cleanup failed, maybe empty db");
    }

    // 2. 插入測試資料
    const users = dataTable.hashes();
    for (const user of users) {
        await prisma.user.create({
            data: {
                email: `${user.name}@test.com`,
                name: user.name,
                balance: parseFloat(user.balance),
                experience: parseInt(user.experience),
            }
        });
    }
});

When('I request the {string} leaderboard', async function (type: string) {
    // 為了測試，我們可能需要繞過 Cache 或者等待 Cache 過期
    // 但在單元測試中，我們可以直接呼叫 UserService.getLeaderboard
    // 如果要測試 Cache 行為，這裡也是好地方

    // 強制讓 Cache 失效 (Hack for testing)
    UserService.cache = {};

    if (type === 'balance' || type === 'experience') {
        leaderboardResult = await UserService.getLeaderboard(type as 'balance' | 'experience');
    }
});

Then('I should see {string} at rank {int}', function (name: string, rank: number) {
    const userAtRank = leaderboardResult[rank - 1];
    assert.ok(userAtRank, `No user found at rank ${rank}`);
    assert.equal(userAtRank.name, name, `Expected ${name} at rank ${rank}, but got ${userAtRank.name}`);
});

AfterAll(async () => {
    await prisma.$disconnect();
});
