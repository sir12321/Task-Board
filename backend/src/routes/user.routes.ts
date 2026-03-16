import { Router } from 'express';
import { listUsers, updateUserAvatar } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listUsers);
router.post('/avatar', upload.single('avatar'), updateUserAvatar);
export default router;
