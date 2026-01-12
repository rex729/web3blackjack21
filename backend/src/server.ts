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
const JWT_SECRET = "mock-jwt-secret-for-local-dev-only"; // In production, move to .env
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

// Auth API


// Google Auth API
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

// Validate Token / Get Me
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

// 餘額更新 API
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

// Socket.io for future real-time features
import { GameService } from "./services/gameService";

// 暫時使用記憶體儲存遊戲狀態 (socketId -> GameService)
const games: Record<string, GameService> = {};

io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // 為該使用者建立一個新的遊戲實例
    games[socket.id] = new GameService();

    // 發送初始狀態
    socket.emit("gameState", games[socket.id].getState());

    socket.on("startGame", async (data: { bet: number, userId: string }) => {
        const game = games[socket.id];
        if (!game) return;

        // 1. 使用 UserService 驗證餘額
        try {
            const user = await UserService.getUser(data.userId);
            if (!user || user.balance < data.bet) {
                socket.emit("error", { message: "Insufficient balance" });
                return;
            }

            // 2. 扣除餘額
            await UserService.updateBalance(data.userId, -data.bet);

            // 3. 開始遊戲邏輯
            game.startGame(data.bet);

            // 4. 發送更新 (餘額與遊戲狀態)
            socket.emit("balanceUpdate", { balance: user.balance - data.bet });
            io.to(socket.id).emit("gameState", game.getState());

        } catch (e) {
            console.error(e);
            socket.emit("error", { message: "Failed to start game" });
        }
    });

    socket.on("hit", () => {
        const game = games[socket.id];
        if (game) {
            game.hit();
            socket.emit("gameState", game.getState());
        }
    });

    socket.on("stand", async (data: { userId: string }) => {
        const game = games[socket.id];
        if (!game) return;

        const { payout } = game.dealerTurn();

        // 如果贏了或平手，同步獎金
        if (payout > 0) {
            try {
                const updatedUser = await UserService.updateBalance(data.userId, payout);
                socket.emit("balanceUpdate", { balance: updatedUser.balance });
            } catch (e) {
                console.error("Payout failed", e);
            }
        }

        socket.emit("gameState", game.getState());
    });

    socket.on("reset", () => {
        const game = games[socket.id];
        if (game) {
            game.resetGame();
            socket.emit("gameState", game.getState());
        }
    });

    socket.on("disconnect", () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
        delete games[socket.id];
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
