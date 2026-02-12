const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const {
  listConfigurationTypes,
  createConfigurationType,
  updateConfigurationType
} = require('../controllers/configuration-type.controller');

router.get('/ls', authenticate, listConfigurationTypes);
router.post('/cr', authenticate, createConfigurationType);
router.put('/up/:id', authenticate, updateConfigurationType);

module.exports = router;
