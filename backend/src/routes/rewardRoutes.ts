import express from 'express';
import { RewardService } from '../services/rewardService';

import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "mock-jwt-secret-for-local-dev-only";

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

router.get('/status', requireAuth, async (req: any, res) => {
    try {
        const status = await RewardService.getRewardStatus(req.user.id);
        res.json(status);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/claim', requireAuth, async (req: any, res) => {
    try {
        const result = await RewardService.claimAdReward(req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
