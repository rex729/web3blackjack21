import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { UserService } from "./services/userService";

dotenv.config();

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
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const user = await UserService.loginOrRegister(email, password);
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
    } catch (error: any) {
        res.status(401).json({ error: error.message || "Authentication failed" });
    }
});

// Balance Update API
app.post("/api/user/balance", async (req, res) => {
    const { userId, amountChange } = req.body;

    if (!userId || typeof amountChange !== "number") {
        return res.status(400).json({ error: "Invalid parameters" });
    }

    try {
        const updatedUser = await UserService.updateBalance(userId, amountChange);
        res.json({ success: true, balance: updatedUser.balance });
    } catch (error) {
        res.status(500).json({ error: "Failed to update balance" });
    }
});

// Socket.io for future real-time features
io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
