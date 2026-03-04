import { Router } from 'express';
import { createComment } from '../controllers/comment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createComment);

export default router;