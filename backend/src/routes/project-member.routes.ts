import { Router } from 'express';
import { addProjectMember, updateProjectMember, removeProjectMember } from '../controllers/project-member.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.post('/', addProjectMember);
router.put('/:userId', updateProjectMember);
router.delete('/:userId', removeProjectMember);

export default router;
