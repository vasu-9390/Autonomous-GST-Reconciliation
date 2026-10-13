import { Router } from 'express';
import { AuthController } from './authController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.getMe);

export default router;
