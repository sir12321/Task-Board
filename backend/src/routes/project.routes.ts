import { Router } from 'express';
import { getProjects, createNewProject, archiveProjectHandler } from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import memberRoutes from './project-member.routes';

const router = Router();

router.use(authenticateToken);
router.use('/:projectId/members', memberRoutes);
router.get('/', getProjects);
router.post('/', createNewProject);
router.patch('/:id/archive', archiveProjectHandler);

export default router;