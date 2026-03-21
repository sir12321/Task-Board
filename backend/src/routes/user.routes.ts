import { Router } from 'express';
import {
  listUsers,
  updateUserAvatar,
  changeName,
  changePassword,
  changeGlobalRole,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listUsers);
router.patch('/:id/global-role', changeGlobalRole);
router.post('/avatar', updateUserAvatar);
router.post('/name', changeName);
router.post('/password', changePassword);
export default router;
