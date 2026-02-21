import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { UserService } from "./services/userService";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

dotenv.config();

const GOOGLE_CLIENT_ID = "35708177818-vt66utfbrr6ivjtjch3nnk31aihfk1e0.apps.googleusercontent.com";
const JWT_SECRET = "mock-jwt-secret-for-local-dev-only"; // 生產環境請移至 .env
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

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
                balance: user.balance
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
                balance: user.balance
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
    try {
        const users = await UserService.getLeaderboard(20);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error("Leaderboard API error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// Socket.io 用於即時功能
// 具備驗證與重連支援的 Socket.io (Socket.io with Auth and Reconnection Support)
import { GameService } from "./services/gameService";

interface AuthenticatedSocket extends Server {
    user?: {
        id: string;
        email: string;
    }
}

// 改變儲存方式：使用 UserId 作為 Key，而不是 SocketId
// 這樣即使斷線重連，只要 UserId 相同，就能找到原本的遊戲狀態
// 改變儲存方式：使用 UserId 作為 Key，而不是 SocketId
// 這樣即使斷線重連，只要 UserId 相同，就能找到原本的遊戲狀態
const games: Record<string, GameService> = {};

// 斷線自動結算倒數計時器 (UserId -> Timeout)
const disconnectTimeouts: Record<string, NodeJS.Timeout> = {};

// Socket.IO Middleware: 驗證 Token
io.use((socket: any, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error"));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        // 簡單查找一下 User 確保存在 (可選)
        UserService.getUser(decoded.userId).then(user => {
            if (!user) return next(new Error("User not found"));
            socket.user = { id: user.id, email: user.email };
            next();
        }).catch(err => {
            next(new Error("Authentication failed"));
        });
    } catch (err) {
        next(new Error("Invalid token"));
    }
});

io.on("connection", (socket: any) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.email} (${socket.id})`);

    // 加入該使用者的專屬房間，方便判斷是否還有其他連線
    socket.join(user.id);

    // 1. 斷線重連檢查 (Reconnection Recovery)
    // 如果有正在倒數的清除排程，表示使用者在限時內重新連上了，取消該排程
    if (disconnectTimeouts[user.id]) {
        console.log(`[Game] User ${user.email} reconnected! Canceling auto-stand timer.`);
        clearTimeout(disconnectTimeouts[user.id]);
        delete disconnectTimeouts[user.id];
    }

    // 1. 斷線重連檢查 (Reconnection Recovery)
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
    } else {
        // 如果沒有，則初始化一個新的 (但不開始)
        // 或者等到 startGame 再建立也可以。這裡維持原樣先建立實例，但在 startGame 重置
        // 為了避免記憶體洩漏，我們可以在 startGame 才真正建立，或者這裡建立但標記為 idle
        // 這裡採取：若無遊戲，暫不建立，等到 startGame 請求
    }

    socket.on("startGame", async (data: { bet: number }) => {
        // 從 socket.user 取得 ID，而不是信任前端傳來的 data.userId
        const userId = user.id;
        console.log(`[Game] startGame request from ${user.email} (ID: ${userId})`);

        // 如果該使用者已有遊戲且正在進行中，或許應該拒絕或重置？
        // 這裡假設 startGame 代表新的一局
        if (!games[userId]) {
            games[userId] = new GameService();
        }
        const game = games[userId];

        // 1. 使用 UserService 驗證餘額
        try {
            const dbUser = await UserService.getUser(userId);
            if (!dbUser || dbUser.balance < data.bet) {
                socket.emit("error", { message: "Insufficient balance" });
                return;
            }

            // 2. 扣除餘額
            await UserService.updateBalance(userId, -data.bet);

            // 3. 開始遊戲邏輯
            game.startGame(data.bet);

            // 4. 發送更新 (餘額與遊戲狀態)
            socket.emit("balanceUpdate", { balance: dbUser.balance - data.bet });
            // 廣播給該使用者的這個 socket (其實如果多裝置登入，應該用 io.to(userId room)... 但目前先這樣)
            socket.emit("gameState", game.getState());

        } catch (e) {
            console.error(e);
            socket.emit("error", { message: "Failed to start game" });
        }
    });

    socket.on("hit", () => {
        const game = games[user.id];
        if (game) {
            game.hit();
            socket.emit("gameState", game.getState());
        }
    });

    socket.on("stand", async () => {
        const game = games[user.id];
        if (!game) return;

        // 防止重複 Stand 或非遊戲狀態
        if (game.status !== 'playing') return;

        const { payout } = game.dealerTurn();

        // 如果贏了或平手，同步獎金
        if (payout > 0) {
            try {
                const updatedUser = await UserService.updateBalance(user.id, payout);
                socket.emit("balanceUpdate", { balance: updatedUser.balance });
            } catch (e) {
                console.error("Payout failed", e);
            }
        }

        socket.emit("gameState", game.getState());
    });

    socket.on("reset", () => {
        const game = games[user.id];
        if (game) {
            game.resetGame();
            socket.emit("gameState", game.getState());
        }
    });

    socket.on("disconnect", async (reason: string) => {
        console.log(`[Socket] Disconnected: ${user.name} (${user.email}) - SocketID: ${socket.id} - Reason: ${reason}`);

        // 檢查該使用者是否還有其他活躍的連線 (例如開了多個分頁)
        const sockets = await io.in(user.id).fetchSockets();
        if (sockets.length > 0) {
            console.log(`[Socket] User ${user.email} has active tabs, keeping game alive.`);
            return;
        }

        // 若無其他連線，啟動 60 秒自動結算 (Auto-Stand) 機制
        console.log(`[Socket] No active connections for ${user.email}. Starting 60s cleanup timer.`);

        disconnectTimeouts[user.id] = setTimeout(async () => {
            console.log(`[Game] Timeout reached for ${user.email}. Enhancing auto-stand logic.`);
            const game = games[user.id];

            if (game) {
                // 如果遊戲還在進行中，視為 "Stand" 自動把牌局跑完並結算
                if (game.status === 'playing') {
                    const { payout } = game.dealerTurn();
                    console.log(`[Game] Auto-stand result for ${user.email}: Payout ${payout}`);

                    if (payout > 0) {
                        try {
                            await UserService.updateBalance(user.id, payout);
                        } catch (e) {
                            console.error("Auto-stand payout update failed", e);
                        }
                    }
                }

                // 移除遊戲狀態
                delete games[user.id];
            }

            delete disconnectTimeouts[user.id];
        }, 5000); // 5 秒 (測試用)
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
