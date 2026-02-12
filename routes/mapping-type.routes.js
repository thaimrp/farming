const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const {
  listMappingTypes,
  createMappingType,
  updateMappingType
} = require('../controllers/mapping-type.controller');

router.get('/ls', authenticate, listMappingTypes);
router.post('/cr', authenticate, createMappingType);
router.put('/up/:id', authenticate, updateMappingType);

module.exports = router;
