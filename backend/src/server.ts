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
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const user = await UserService.loginOrRegister(email, password);

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
        res.status(401).json({ error: error.message || "Authentication failed" });
    }
});

// Google Auth API
app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: "Google credential is required" });
    }

    try {
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

        // Login or register with Google info
        const user = await UserService.loginOrRegister(email, undefined, name, image);

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
