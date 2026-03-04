import { Router } from 'express';
import { getProjects, createNewProject } from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getProjects);
router.post('/', createNewProject);

export default router;