import { GameConfig } from "../services/gameService";

export const LEVEL_RULES: Record<string, GameConfig> = {
    'level-1': {
        name: 'Downtown Basement',
        subtitle: '自家地下室',
        buyIn: 0,
        prize: 'Variable',
        color: '#1e40af', // 深藍 (Royal Blue)
        image: '🏙️',
        features: ['1v1', 'Free Chips', 'Side Bets'],
        hit17: true,
        payoutBlackjack: 1.5,
        fiveCardCharlie: false,
        surrenderAllowed: false,
        sideBets: true,
        xpMultiplier: 1.0,
        allowedChips: [5, 25, 100, 500, 1000],
        doubleAllowed: false,
        decks: 6,
        minLevel: 1,
        locked: false
    },
    'level-2': {
        name: 'Sydney Harbor',
        subtitle: '雪梨港灣',
        buyIn: 2500,
        prize: '5,000',
        color: '#f59e0b', // 琥珀黃 (Amber) - 與藍互補
        image: '🌉',
        features: ['Fast Paced', 'Higher stakes', 'Standard Pays'],
        hit17: true,
        payoutBlackjack: 1.5,
        fiveCardCharlie: false,
        surrenderAllowed: false,
        sideBets: false,
        xpMultiplier: 1.1,
        allowedChips: [100, 500, 1000],
        doubleAllowed: true,
        decks: 1,
        minLevel: 1,
        locked: false
    },
    'level-3': {
        name: 'Las Vegas Strip',
        subtitle: '拉斯維加斯',
        buyIn: 50000,
        prize: '100,000',
        color: '#7c3aed', // 鮮豔紫 (Violet)
        image: '🎰',
        features: ['Surrender', 'Insurance', 'Advanced'],
        hit17: true,
        payoutBlackjack: 1.5,
        fiveCardCharlie: false,
        surrenderAllowed: true,
        sideBets: false,
        xpMultiplier: 1.25,
        allowedChips: [100, 500, 1000, 3000, 5000],
        doubleAllowed: true,
        decks: 4,
        minLevel: 2,
        locked: false
    },
    'level-4': {
        name: 'Dubai Palace',
        subtitle: '杜拜皇宮',
        buyIn: 1000000,
        prize: '2,000,000',
        color: '#dc2626', // 純鮮紅 (Red) - 與綠背景強對比
        image: '🕌',
        features: ['S17 Stand', '5-Card Charlie', 'VIP'],
        hit17: false, // S17
        payoutBlackjack: 1.5,
        fiveCardCharlie: true,
        surrenderAllowed: true,
        sideBets: false,
        xpMultiplier: 1.5,
        allowedChips: [100, 500, 1000, 3000, 5000],
        doubleAllowed: true,
        decks: 6,
        minLevel: 4,
        locked: false
    },
    'level-5': {
        name: 'Monte Carlo',
        subtitle: '蒙地卡羅',
        buyIn: 40000000,
        prize: '100M',
        color: '#0ea5e9', // 天空藍 (Sky Blue) - 與紅/紫形成跳色
        image: '🏰',
        features: ['Side Bets', 'Perfect Pairs', '21+3'],
        hit17: false, // S17
        payoutBlackjack: 1.5,
        fiveCardCharlie: true,
        surrenderAllowed: true,
        sideBets: true,
        xpMultiplier: 2.0,
        allowedChips: [5000, 10000, 20000, 100000, 200000],
        doubleAllowed: true,
        decks: 6,
        minLevel: 6,
        locked: false
    }
};
