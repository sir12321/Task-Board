import { Router } from 'express';
import { createTask, deleteTask, updateColumn } from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/tasks',createTask);
router.put('/tasks/:id/move', updateColumn);
router.delete('/tasks/:id', deleteTask);

export default router;