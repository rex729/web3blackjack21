
/**
 * 經驗值系統配置與計算邏輯
 * 
 * 設計：
 * - 採用累積總經驗值 (Total Cumulative XP)
 * - 升級公式：每 1000 XP 升一級
 *   - Lv.1: 0-999 XP
 *   - Lv.2: 1000-1999 XP
 *   - ...
 */

export const XP_PER_LEVEL = 1000;

export interface LevelInfo {
    level: number;
    currentLevelXp: number; // 當前等級已獲得的經驗值 (用於進度條)
    nextLevelXpThreshold: number; // 升級所需經驗值 (永遠為 1000)
    progressPercent: number; // 進度百分比 (0-100)
}

/**
 * 根據總經驗值計算等級資訊
 * @param totalXp 累積總經驗值
 */
export function calculateLevel(totalXp: number): LevelInfo {
    // 防止負數
    const safeXp = Math.max(0, totalXp);

    const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
    const currentLevelXp = safeXp % XP_PER_LEVEL;
    const nextLevelXpThreshold = XP_PER_LEVEL;
    const progressPercent = Math.min(100, Math.floor((currentLevelXp / nextLevelXpThreshold) * 100));

    return {
        level,
        currentLevelXp,
        nextLevelXpThreshold,
        progressPercent
    };
}
