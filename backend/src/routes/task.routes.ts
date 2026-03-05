import { Router } from 'express';
import { createTask, deleteTask, updateColumn, closeTaskHandler } from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/tasks', createTask);
router.put('/tasks/:id/move', updateColumn);
router.patch('/tasks/:id/close', closeTaskHandler);
router.delete('/tasks/:id', deleteTask);

export default router;