const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  verifyLimiter
} = require('../middleware/rate-limit');

router.post('/register', registerLimiter, authController.register);
router.get('/vf/:token', verifyLimiter, authController.verifyEmail);
router.post('/login', loginLimiter, authController.login);
router.post('/rf', refreshLimiter, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/loa', authenticate, authController.logoutAll);
router.post('/cpw', authenticate, authController.changePassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
