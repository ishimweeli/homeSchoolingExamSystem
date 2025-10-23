import { Router } from 'express';
import { verifyToken , requireRole} from '../middleware/auth';
import { withOrg } from '../middleware/withOrg';
import { sendInvite, acceptInvite, getSentInvites, cancelInvite,resendInviteByCode} from '../controllers/inviteController';

const router = Router();

// Create/send an invite
router.post('/', verifyToken,requireRole('ADMIN','TEACHER'), withOrg, sendInvite);

router.post('/accept', acceptInvite);

router.get('/', verifyToken,requireRole('ADMIN','TEACHER'), withOrg, getSentInvites);
router.put('/:id', verifyToken,requireRole('ADMIN','TEACHER'),withOrg, cancelInvite);
router.post('/resend',resendInviteByCode);

export default router;
