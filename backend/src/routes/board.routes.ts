import { Router } from 'express';
import { getBoard, addBoard } from '../controllers/board.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const r = Router();

r.use(authenticateToken);
r.get('/:id', getBoard);
r.post('/', addBoard);

export default r;