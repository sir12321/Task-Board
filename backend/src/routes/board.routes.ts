import { Router } from 'express';
import {
  getBoard,
  addBoard,
  editBoardWorkflow,
} from '../controllers/board.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const r = Router();

r.use(authenticateToken);
r.get('/:id', getBoard);
r.post('/', addBoard);
r.put('/:id/workflow', editBoardWorkflow);

export default r;
