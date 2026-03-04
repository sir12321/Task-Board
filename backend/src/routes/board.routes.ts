import { Router } from 'express';
import { getBoard } from '../controllers/board.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const r = Router();

r.use(authenticateToken);
r.get('/:id', getBoard);

export default r;