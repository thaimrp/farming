const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const {
  listMappings,
  filterMappings,
  createMapping,
  updateMapping
} = require('../controllers/mapping.controller');

router.get('/ls', authenticate, listMappings);
router.post('/fl', authenticate, filterMappings);
router.post('/cr', authenticate, createMapping);
router.put('/up/:id', authenticate, updateMapping);

module.exports = router;
