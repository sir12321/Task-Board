import { Router } from 'express';
import { createTask, deleteTask, editTask, updateTaskStatus } from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createTask);
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id', editTask);
router.delete('/:id', deleteTask);

export default router;