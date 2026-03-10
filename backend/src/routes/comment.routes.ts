import { Router } from 'express';
import { createComment, removeComment, updateComment } from '../controllers/comment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createComment);
router.delete('/:commentId', removeComment);
router.put('/:commentId', updateComment);

export default router;