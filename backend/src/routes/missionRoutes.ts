import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';
import { MissionService } from '../services/missionService';

const router = express.Router();

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

/**
 * GET /api/missions/status
 * Fetches the user's current daily mission progress and claim status
 */
router.get('/status', requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
        // req.user is populated by authenticateToken
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const status = await MissionService.getProgress(userId);
        res.json(status);
    } catch (error: any) {
        console.error('[Mission API] Fetch Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/missions/claim
 * Claims a specific mission reward
 */
router.post('/claim', requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const { missionId } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!missionId) {
            res.status(400).json({ error: 'missionId is required' });
            return;
        }

        const result = await MissionService.claimMission(userId, missionId);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error(`[Mission API] Claim Error for ${req.body?.missionId}:`, error.message);
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;
