import { Router } from 'express';
import { listUsers } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listUsers);

export default router;
