import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { UserService } from '../../src/services/userService';
import { calculateLevel } from '../../src/utils/levelSystem';
import { LEVEL_RULES } from '../../src/config/rules';

// 模擬的玩家資料狀態 (為了在 BDD 步驟間傳遞)
let testUser: {
    id: string;
    username: string;
    experience: number;
    balance: number;
} | null = null;

let gainedXpFromLastGame = 0;
let currentLevelId = 'level-1';

Given('a user {string} exists with {int} XP and {int} balance', function (username: string, xp: number, balance: number) {
    testUser = {
        id: 'test-user-id',
        username: username,
        experience: xp,
        balance: balance
    };
    gainedXpFromLastGame = 0;
});

Given('{string} plays in {string}', function (username: string, levelId: string) {
    assert.equal(testUser?.username, username);
    currentLevelId = levelId;
});

When('{string} wins a game with bet {int}', function (username: string, bet: number) {
    assert.equal(testUser?.username, username);
    assert.ok(testUser);

    // 模擬實際遊戲結算邏輯 (依照 gameService.ts 的演算法)
    const levelConfig = LEVEL_RULES[currentLevelId];
    assert.ok(levelConfig, `Level config not found for ${currentLevelId}`);

    const baseExperienceEarned = bet; // 贏得遊戲獲得等同下注金額的基礎經驗值
    gainedXpFromLastGame = Math.floor(baseExperienceEarned * levelConfig.xpMultiplier);

    // 更新玩家總經驗值
    testUser!.experience += gainedXpFromLastGame;
});

When('{string} loses a game with bet {int}', function (username: string, bet: number) {
    assert.equal(testUser?.username, username);
    assert.ok(testUser);

    // 輸牌不獲得經驗值
    gainedXpFromLastGame = 0;
    testUser!.experience += gainedXpFromLastGame;
});

When('{string} pushes a game with bet {int}', function (username: string, bet: number) {
    assert.equal(testUser?.username, username);
    assert.ok(testUser);

    // 平手不獲得經驗值
    gainedXpFromLastGame = 0;
    testUser!.experience += gainedXpFromLastGame;
});

Then('{string} should gain {int} XP', function (username: string, expectedGainedXp: number) {
    assert.equal(testUser?.username, username);
    assert.equal(gainedXpFromLastGame, expectedGainedXp);
});

Then('{string} total XP should be {int}', function (username: string, expectedTotalXp: number) {
    assert.equal(testUser?.username, username);
    assert.equal(testUser?.experience, expectedTotalXp);
});

Then('{string} level should be {int}', function (username: string, expectedLevel: number) {
    assert.equal(testUser?.username, username);
    assert.ok(testUser);

    const levelInfo = calculateLevel(testUser!.experience);
    assert.equal(levelInfo.level, expectedLevel);
});
