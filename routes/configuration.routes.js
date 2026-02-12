const router = require('express').Router();

const {
  listConfigurations,
  filterConfigurations,
  createConfiguration,
  updateConfiguration,
  getTypes
} = require('../controllers/configuration.controller');
const authenticate = require('../middleware/authenticate');

// short routes, same behavior as scheduler configuration module
router.get('/ls', authenticate, listConfigurations);
router.get('/tp', authenticate, getTypes);
router.post('/cr', authenticate, createConfiguration);
router.post('/fl', authenticate, filterConfigurations);
router.put('/up/:id', authenticate, updateConfiguration);

module.exports = router;
