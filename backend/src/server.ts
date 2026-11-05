import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { UserService } from "./services/userService";
import { GameService } from "./services/gameService";
import { MissionService } from "./services/missionService";
import { LEVEL_RULES } from "./config/rules";
import { calculateLevel } from "./utils/levelSystem";
import { JWT_SECRET } from "./config/jwt";
import rewardRoutes from "./routes/rewardRoutes";
import missionRoutes from "./routes/missionRoutes";

dotenv.config();

const GOOGLE_CLIENT_ID = "35708177818-vt66utfbrr6ivjtjch3nnk31aihfk1e0.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const CLEANUP_TIMEOUT = 10000; // 斷線後保留遊戲的緩衝時間 (毫秒)

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Apply Routes
app.use('/api/rewards', rewardRoutes);
app.use('/api/missions', missionRoutes);

// Auth API (認證 API)


// Google Auth API (Google 登入驗證)
app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: "Google credential is required" });
    }

    try {
        // 驗證 Google 傳來的 ID Token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new Error("Invalid Google token");
        }

        const email = payload.email;
        const name = payload.name || email.split("@")[0];
        const image = payload.picture || "";

        // 使用 Google 資訊進行登入或註冊
        const user = await UserService.loginOrRegister(email, undefined, name, image);

        // 簽發 JWT
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

        console.log(`[Auth] Google Login Success: ${user.name} (${user.email}) - ID: ${user.id}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                balance: user.balance,
                experience: user.experience,
                level: calculateLevel(user.experience).level // Computed level
            }
        });
    } catch (error: any) {
        console.error("Google verify error:", error);
        res.status(401).json({ error: "Google authentication failed" });
    }
});

// Validate Token / Get Me (驗證 Token / 取得個人資訊)
app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await UserService.getUser(decoded.userId);
        if (!user) throw new Error("User not found");

        console.log(`[Auth] Session Resumed: ${user.name} (${user.email})`);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                balance: user.balance,
                experience: user.experience,
                level: calculateLevel(user.experience).level // Computed level
            }
        });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

// 餘額更新 API (Balance Update API)
// 前端遊戲結束或下注時呼叫此 API 更新使用者餘額
app.post("/api/user/balance", async (req, res) => {
    const { userId, amountChange } = req.body;

    if (!userId || typeof amountChange !== "number") {
        return res.status(400).json({ error: "Invalid parameters" });
    }

    try {
        // 更新資料庫中的餘額
        const updatedUser = await UserService.updateBalance(userId, amountChange);
        res.json({ success: true, balance: updatedUser.balance });
    } catch (error) {
        res.status(500).json({ error: "Failed to update balance" });
    }
});

// 排行榜 API (Leaderboard API)
app.get("/api/leaderboard", async (req, res) => {
    const type = req.query.type as 'balance' | 'experience' || 'balance';
    const limit = 50;

    if (type !== 'balance' && type !== 'experience') {
        return res.status(400).json({ error: "Invalid type. Use 'balance' or 'experience'." });
    }

    try {
        const users = await UserService.getLeaderboard(type, limit);

        // 格式化回傳資料 (包含計算後的等級)
        const formattedLeaderboard = users.map((user: any) => ({
            id: user.id,
            name: user.name,
            image: user.image,
            balance: user.balance,
            experience: user.experience,
            level: calculateLevel(user.experience).level
        }));

        res.json({ success: true, data: formattedLeaderboard });
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// 關卡資訊 API (Levels API)
app.get("/api/game/levels", (req, res) => {
    // 將 LEVEL_RULES 轉換為陣列格式方便前端使用
    const levelsArray = Object.entries(LEVEL_RULES).map(([id, config]) => ({
        id,
        ...config
    }));
    res.json({ success: true, data: levelsArray });
});

// Socket.io 用於即時功能
// 具備驗證與重連支援的 Socket.io (Socket.io with Auth and Reconnection Support)

interface AuthenticatedSocket extends Socket {
    user: {
        id: string;
        email: string;
        name: string;
    }
}

// 遊戲實例儲存：使用 UserId 作為 Key，確保跨分頁/重連狀態一致
const games: Record<string, GameService> = {};

// 斷線自動結算倒數計時器 (UserId -> Timeout)
const disconnectTimeouts: Record<string, NodeJS.Timeout> = {};

/**
 * 輔助函式：彙整並印出目前所有連線使用者的 Email 列表
 */
function printConnectedUsers() {
    // 建立 1-5 關卡的玩家清單
    const distribution: string[][] = [[], [], [], [], []];
    const lobbyUsers = new Set<string>();

    // 從 Socket 連線中找出所有連線的使用者
    const allConnectedUsers = new Map<string, { email: string, name: string }>();
    io.sockets.sockets.forEach((socket: any) => {
        if (socket.user) {
            allConnectedUsers.set(socket.user.id, {
                email: socket.user.email,
                name: socket.user.name
            });
        }
    });

    // 依據 games 物件將玩家分類
    allConnectedUsers.forEach((userInfo, userId) => {
        const game = games[userId];
        const displayName = userInfo.name || userInfo.email;

        if (game && game.levelId) {
            // 解析 level-N 中的 N
            const levelMatch = game.levelId.match(/level-(\d+)/);
            if (levelMatch) {
                const levelIndex = parseInt(levelMatch[1]) - 1;
                if (levelIndex >= 0 && levelIndex < 5) {
                    distribution[levelIndex].push(displayName);
                    return;
                }
            }
        }
        // 若沒有關卡資訊或格式不符，視為在大廳
        lobbyUsers.add(displayName);
    });

    console.log(`[Connections] Distribution (L1-L5):`, JSON.stringify(distribution));
    if (lobbyUsers.size > 0) {
        console.log(`[Connections] Idle in Lobby:`, Array.from(lobbyUsers));
    }
}



// Socket.IO Middleware: 驗證 Token
io.use(async (socket: any, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error"));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await UserService.getUser(decoded.userId);

        if (!user) {
            return next(new Error("User not found"));
        }

        // 儲存完整的 User 資訊到 Socket 物件中
        socket.user = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
});

io.on("connection", async (socket: any) => {
    const user = socket.user;

    // 立即加入該使用者的專屬房間
    socket.join(user.id);

    // 0. 強制單一登入邏輯：踢掉該使用者的所有舊連線
    const existingSockets = await io.in(user.id).fetchSockets();
    for (const oldSocket of existingSockets) {
        if (oldSocket.id !== socket.id) {
            console.log(`[Socket] Kicking old session for ${user.email} (SocketID: ${oldSocket.id})`);
            oldSocket.emit("error", {
                code: "MULTIPLE_LOGIN",
                message: "您已在其他分頁登入，本對話已被終止。"
            });
            oldSocket.disconnect();
        }
    }

    console.log(`[Socket] Connected: ${user.email} (${socket.id})`);

    // Sends server info (e.g. Pod Name) for debugging
    socket.emit("serverInfo", {
        podName: process.env.HOSTNAME || "localhost"
    });

    // 1. 斷線重連檢查 (Reconnection Recovery)
    if (disconnectTimeouts[user.id]) {
        console.log(`[Game] User ${user.email} reconnected! Canceling logout timer.`);
        clearTimeout(disconnectTimeouts[user.id]);
        delete disconnectTimeouts[user.id];
    }

    // 檢查該使用者是否已經有進行中的遊戲
    let game = games[user.id];

    if (game) {
        console.log(`[Game] Resuming session for ${user.email}`);
        // 如果有，立即發送目前的遊戲狀態
        socket.emit("gameState", game.getState());

        // 也可以順便發送餘額更新，確保一致
        UserService.getUser(user.id).then(u => {
            if (u) socket.emit("balanceUpdate", { balance: u.balance });
        });
    }

    // 列印當前在線人數
    printConnectedUsers();

    // 2. 加入關卡 (綁定規則)
    socket.on("joinLevel", (data: { levelId: string }) => {
        const rules = LEVEL_RULES[data.levelId] || LEVEL_RULES['level-1'];
        console.log(`[Socket] ${user.email} joining ${data.levelId}. Applying rules:`, rules);

        if (!games[user.id]) {
            games[user.id] = new GameService(data.levelId, rules);
        } else {
            // 如果玩家已在遊戲中，我們不應該在「加牌/看牌」時切換其底層規則
            // 但如果是在 idle/betting 狀態，則更新規則
            const currentGame = games[user.id];
            const safeToUpdate = ['idle', 'betting', 'won', 'lost', 'push', 'blackjack'].includes(currentGame.status);

            if (safeToUpdate) {
                // 更新規則與關卡 ID
                currentGame.config = { ...currentGame.config, ...rules };
                currentGame.levelId = data.levelId;
                console.log(`[Game] Rules and Level updated for ${user.email} -> ${data.levelId}`);
            }
        }

        // 發送目前狀態 (包含可能更新後的規則資訊)
        socket.emit("gameState", games[user.id].getState());

        // 玩家切換關卡後，立即更新連線分佈日誌
        printConnectedUsers();
    });

    socket.on("startGame", async (data: { bet: number, sideBets?: { perfectPairs?: number, twentyOnePlusThree?: number } }) => {
        // 從 socket.user 取得 ID，而不是信任前端傳來的 data.userId
        const userId = user.id;
        const sideBets = data.sideBets || {};
        const totalSideBet = (sideBets.perfectPairs || 0) + (sideBets.twentyOnePlusThree || 0);
        const totalBet = data.bet + totalSideBet;

        console.log(`[Game] startGame request from ${user.email} (ID: ${userId}) - Main Bet: ${data.bet}, Side Bets: ${totalSideBet}`);

        // 確保遊戲實例存在
        if (!games[userId]) {
            // 保底機制：若未 call joinLevel 則使用預設規則
            games[userId] = new GameService('level-1', LEVEL_RULES['level-1']);
        }
        const game = games[userId];

        // 0. 防止重複開賽
        if (game.status === 'playing' || game.status === 'dealerTurn') {
            socket.emit("error", { message: "Game already in progress" });
            return;
        }

        // 1. 驗證餘額 (主注 + 邊注)
        try {
            const dbUser = await UserService.getUser(userId);
            if (!dbUser || dbUser.balance < totalBet) {
                socket.emit("error", { message: "Insufficient balance" });
                return;
            }

            // 2. 扣除總下注額 (主注 + 邊注)
            await UserService.updateBalance(userId, -totalBet);

            // 3. 開始遊戲邏輯 (包含結算邊注)
            const { sideBetPayout } = game.startGame(data.bet, sideBets);

            // 4. 如果邊注有贏，立即派彩
            let currentBalance = dbUser.balance - totalBet;
            if (sideBetPayout > 0) {
                const updatedUser = await UserService.updateBalance(userId, sideBetPayout);
                currentBalance = updatedUser.balance;
                console.log(`[Game] Side Bet Payout for ${user.email}: +$${sideBetPayout}`);
            }

            // 5. 廣播更新
            socket.emit("balanceUpdate", { balance: currentBalance });
            socket.emit("gameState", game.getState());

        } catch (e) {
            console.error(e);
            socket.emit("error", { message: "Failed to start game" });
        }
    });

    socket.on("hit", async () => {
        const game = games[user.id];
        if (game) {
            game.hit();

            // 檢查是否觸發 5-Card Charlie (或其他直接勝利條件)
            if (game.status === 'won') {
                try {
                    const payout = game.currentBet * 2;
                    const xpMultiplier = game.config.xpMultiplier || 1;
                    const xpGained = Math.floor(100 * xpMultiplier);

                    const updatedUser = await MissionService.settleGameResult(user.id, 'win', payout, xpGained, game.playerHand.length);

                    console.log(`[Game] 5-Card Charlie! ${user.email} Wins ${payout}`);

                    // 廣播餘額、等級與狀態
                    socket.emit("balanceUpdate", { balance: updatedUser.balance });
                    const levelInfo = calculateLevel(updatedUser.experience);
                    socket.emit("userUpdate", { level: levelInfo.level, experience: updatedUser.experience });
                    socket.emit("gameState", game.getState());
                } catch (e) {
                    console.error("5-Card Charlie payout failed", e);
                }
            } else if (game.status === 'lost') {
                await MissionService.settleGameResult(user.id, 'lose', 0, 0, game.playerHand.length);
                socket.emit("gameState", game.getState());
            } else {
                socket.emit("gameState", game.getState());
            }
        }
    });

    socket.on("double", async () => {
        const game = games[user.id];
        if (!game || game.status !== 'playing') return;

        // 1. 檢查餘額是否足夠加倍
        const currentBet = game.currentBet;
        try {
            const dbUser = await UserService.getUser(user.id);
            if (!dbUser || dbUser.balance < currentBet) { // Double 需要額外扣除等額籌碼
                socket.emit("error", { message: "Insufficient balance to double" });
                return;
            }

            // 2. 扣款
            console.log(`[Game] Double Down: Deducting additional ${currentBet} from ${user.email}`);
            await UserService.updateBalance(user.id, -currentBet);

            // 3. 執行 Double 邏輯
            const success = game.doubleDown();

            // 印出新的賭注確認
            console.log(`[Game] Double Down Success. New Bet: ${game.currentBet} (Original: ${currentBet})`);

            if (!success) {
                // 若失敗 (例如非首兩張牌)，退還扣款
                console.log(`[Game] Double logic failed. Refunding ${currentBet}`);
                await UserService.updateBalance(user.id, currentBet);
                socket.emit("error", { message: game.message });
                return;
            }

            // 4. 更新餘額與狀態給前端
            const dbUserAfterDouble = await UserService.getUser(user.id);
            console.log(`[Game] Balance after Double deduction: ${dbUserAfterDouble?.balance}`);

            if (game.getState().status === 'lost') {
                await MissionService.settleGameResult(user.id, 'lose', 0, 0, game.playerHand.length);
            }

            socket.emit("balanceUpdate", { balance: dbUserAfterDouble?.balance ?? 0 });
            socket.emit("gameState", game.getState());

            // 5. 如果沒有爆牌，自動進行結算 (如同 Stand)
            if (game.status === 'playing') {
                // 給一點延遲感，讓玩家看到翻倍後的底牌
                setTimeout(async () => {
                    const { payout } = game.dealerTurn();
                    console.log(`[Game] Double Result Payout: ${payout}`);

                    const isWin = payout > game.currentBet;
                    const isPush = payout === game.currentBet;
                    const result = isWin ? 'win' : isPush ? 'push' : 'lose';

                    const xpMultiplier = game.config.xpMultiplier || 1;
                    const xpGained = isWin ? Math.floor(100 * xpMultiplier) : 0;

                    try {
                        const updatedUser = await MissionService.settleGameResult(user.id, result, payout, xpGained, game.playerHand.length);

                        socket.emit("balanceUpdate", { balance: updatedUser.balance });
                        if (xpGained > 0) {
                            const levelInfo = calculateLevel(updatedUser.experience);
                            socket.emit("userUpdate", { level: levelInfo.level, experience: updatedUser.experience });
                        }
                    } catch (e) {
                        console.error("Double payout failed", e);
                    }
                    socket.emit("gameState", game.getState());
                }, 1000); // 1秒延遲
            }
        } catch (e) {
            console.error("Double down failed", e);
        }
    });

    socket.on("stand", async () => {
        const game = games[user.id];
        if (!game || game.status !== 'playing') return;

        const { payout } = game.dealerTurn();

        const isWin = payout > game.currentBet;
        const isPush = payout === game.currentBet;
        const result = isWin ? 'win' : isPush ? 'push' : 'lose';

        const xpMultiplier = game.config.xpMultiplier || 1;
        const xpGained = isWin ? Math.floor(100 * xpMultiplier) : 0;

        try {
            const updatedUser = await MissionService.settleGameResult(user.id, result, payout, xpGained, game.playerHand.length);

            socket.emit("balanceUpdate", { balance: updatedUser.balance });
            if (xpGained > 0) {
                const levelInfo = calculateLevel(updatedUser.experience);
                socket.emit("userUpdate", { level: levelInfo.level, experience: updatedUser.experience });
            }
        } catch (e) {
            console.error("Stand payout failed", e);
        }

        socket.emit("gameState", game.getState());
    });

    socket.on("surrender", async () => {
        const game = games[user.id];
        if (!game || game.status !== 'playing') return;

        try {
            // 執行投降邏輯
            const refund = game.surrender();

            if (refund > 0) {
                const updatedUser = await MissionService.settleGameResult(user.id, 'lose', refund, 0, game.playerHand.length);
                console.log(`[Game] User ${user.email} surrendered. Refund: ${refund}.`);
                socket.emit("balanceUpdate", { balance: updatedUser.balance });
            } else {
                // 若投降失敗 (例如不符合條件)，回傳錯誤
                if (game.message) {
                    socket.emit("error", { message: game.message });
                }
            }

            // 無論成功與否，同步最新狀態
            socket.emit("gameState", game.getState());

        } catch (e) {
            console.error("Surrender failed", e);
            socket.emit("error", { message: "Surrender failed" });
        }
    });

    socket.on("reset", () => {
        const game = games[user.id];
        if (game) {
            game.resetGame();
            socket.emit("gameState", game.getState());
        }
    });

    socket.on("leaveTable", async () => {
        const game = games[user.id];
        if (game) {
            if (game.status === 'playing') {
                // 如果在遊戲中「主動」離開，立即幫他結算 (不再等待動畫，確保數據即時性)
                const { payout } = game.dealerTurn();

                const isWin = payout > game.currentBet;
                const isPush = payout === game.currentBet;
                const result = isWin ? 'win' : isPush ? 'push' : 'lose';

                try {
                    await MissionService.settleGameResult(user.id, result, payout, 0, game.playerHand.length);
                } catch (e) {
                    console.error("Leave-table payout failed", e);
                }
            }
            delete games[user.id];
            // 玩家離開遊戲後，立即更新連線分佈日誌
            printConnectedUsers();
        }
        console.log(`[Socket] User ${user.email} explicitly left the table.`);
    });

    socket.on("disconnect", async (reason: string) => {
        console.log(`[Socket] Disconnected: ${user.name} (${user.email}) - SocketID: ${socket.id} - Reason: ${reason}`);

        // 檢查該使用者是否還有其他活躍的連線 (例如剛剛「踢人」的新連線)
        const sockets = await io.in(user.id).fetchSockets();
        if (sockets.length > 0) {
            console.log(`[Socket] User ${user.email} has another active session, skipping auto-stand.`);
            return;
        }

        // 若無其他連線，啟動自動結算 (Auto-Stand) 機制
        console.log(`[Socket] No active connections for ${user.email}. Starting ${CLEANUP_TIMEOUT / 1000}s cleanup timer.`);

        disconnectTimeouts[user.id] = setTimeout(async () => {
            const game = games[user.id];
            if (game) {
                if (game.status === 'playing') {
                    const { payout } = game.dealerTurn();
                    const pScore = game.calculateScore(game.playerHand);
                    const dScore = game.calculateScore(game.dealerHand);
                    console.log(`[Game] Auto-stand result for ${user.email}: [Player: ${pScore} vs Dealer: ${dScore}] Payout ${payout}`);

                    const isWin = payout > game.currentBet;
                    const isPush = payout === game.currentBet;
                    const result = isWin ? 'win' : isPush ? 'push' : 'lose';

                    const xpMultiplier = game.config.xpMultiplier || 1;
                    const xpGained = isWin ? Math.floor(100 * xpMultiplier) : 0;

                    try {
                        await MissionService.settleGameResult(user.id, result, payout, xpGained, game.playerHand.length);
                    } catch (e) {
                        console.error("Auto-stand settlement failed", e);
                    }
                }
                delete games[user.id];
            }
            delete disconnectTimeouts[user.id];
            printConnectedUsers();
        }, CLEANUP_TIMEOUT);
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
