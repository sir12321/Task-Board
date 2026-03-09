import { Router } from 'express';
import { createTask, deleteTask, updateColumn, closeTaskHandler, editTask } from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createTask);
router.put('/:id/move', updateColumn);
router.patch('/:id/close', closeTaskHandler);
router.patch('/:id', editTask);
router.delete('/:id', deleteTask);

export default router;