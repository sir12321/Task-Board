import { Router } from 'express';
import {
  addColumn,
  editColumn,
  removeColumn,
  reorderColumn,
} from '../controllers/column.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', addColumn);
router.put('/:id/reorder', reorderColumn);
router.put('/:id', editColumn);
router.delete('/:id', removeColumn);

export default router;
