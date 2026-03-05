import { Router } from 'express';
import { getUserNotifications, readNotification } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getUserNotifications);
router.patch('/:id/read', readNotification);

export default router;
