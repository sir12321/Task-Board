import { Router } from 'express';
import {
  listUsers,
  updateUserAvatar,
  changeName,
  changePassword,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listUsers);
router.post('/avatar', upload.single('avatar'), updateUserAvatar);
router.post('/name', changeName);
router.post('/password', changePassword);
export default router;
