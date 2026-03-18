import { Router } from 'express';
import {
  listUsers,
  updateUserAvatar,
  changeName,
  changePassword,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listUsers);
router.post('/avatar', updateUserAvatar);
router.post('/name', changeName);
router.post('/password', changePassword);
export default router;
