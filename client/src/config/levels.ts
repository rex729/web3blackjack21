export interface LevelConfig {
    id: string;
    name: string;
    subtitle: string;
    type: string;
    buyIn: number;
    prize: string;
    color: string;
    locked: boolean;
    features: string[];
    image: string;
}

export const LEVELS: LevelConfig[] = [
    {
        id: 'level-1',
        name: 'Downtown Basement',
        subtitle: '自家地下室',
        type: 'Single Player',
        buyIn: 0,
        prize: 'Variable',
        color: 'from-zinc-800 to-zinc-900',
        locked: false,
        features: ['1v1', 'Free Chips', 'Practice'],
        image: '🏙️'
    },
    {
        id: 'level-2',
        name: 'Sydney Harbor',
        subtitle: '雪梨港灣',
        type: 'Multiplayer',
        buyIn: 2500,
        prize: '5,000',
        color: 'from-blue-800 to-blue-900',
        locked: false,
        features: ['3 Players', 'Emojis', 'Standard Pays'],
        image: '🌉'
    },
    {
        id: 'level-3',
        name: 'Las Vegas Strip',
        subtitle: '拉斯維加斯',
        type: 'Strategist',
        buyIn: 50000,
        prize: '100,000',
        color: 'from-purple-800 to-purple-900',
        locked: true,
        features: ['Surrender', 'Insurance', 'Advanced'],
        image: '🎰'
    },
    {
        id: 'level-4',
        name: 'Dubai Palace',
        subtitle: '杜拜皇宮',
        type: 'High Roller',
        buyIn: 1000000,
        prize: '2,000,000',
        color: 'from-yellow-700 to-yellow-900',
        locked: true,
        features: ['S17 Stand', '5-Card Charlie', 'VIP'],
        image: '🕌'
    },
    {
        id: 'level-5',
        name: 'Monte Carlo',
        subtitle: '蒙地卡羅',
        type: 'Legendary',
        buyIn: 50000000,
        prize: '100M',
        color: 'from-red-800 to-red-950',
        locked: true,
        features: ['Side Bets', 'Perfect Pairs', '21+3'],
        image: '🏰'
    }
];
