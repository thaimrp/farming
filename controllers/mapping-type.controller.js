const MappingType = require('../model/mapping-type.model');
const response = require('../helpers/response');
const AppError = require('../helpers/apperror');
const asyncHandler = require('../helpers/async.handler');

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

exports.listMappingTypes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.map_type) filter.map_type = normalizeCode(req.query.map_type);
  if (req.query.status) filter.status = String(req.query.status).trim().toUpperCase();

  const data = await MappingType.find(filter).sort({ map_type: 1 });
  response.success(res, data, 'Mapping types loaded');
});

exports.createMappingType = asyncHandler(async (req, res) => {
  const { map_type, description, status } = req.body || {};
  if (!map_type || !description) {
    throw new AppError('map_type and description are required', 400, 'E_MAP_TYPE_REQUIRED_FIELDS');
  }

  try {
    const doc = await MappingType.create({
      map_type: normalizeCode(map_type),
      description: String(description).trim(),
      status: status ? String(status).trim().toUpperCase() : 'ACTIVE'
    });
    response.success(res, doc, 'Mapping type created', 201);
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError('Mapping type already exists', 409, 'E_MAP_TYPE_DUPLICATE');
    }
    throw err;
  }
});

exports.updateMappingType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await MappingType.findById(id);
  if (!doc) throw new AppError('Mapping type not found', 404, 'E_MAP_TYPE_NOT_FOUND');

  if (req.body?.map_type) {
    throw new AppError('Cannot change map_type', 400, 'E_MAP_TYPE_IMMUTABLE_CODE');
  }

  const { description, status } = req.body || {};
  if (description !== undefined) doc.description = String(description).trim();
  if (status !== undefined) doc.status = String(status).trim().toUpperCase();

  await doc.save();
  response.success(res, doc, 'Mapping type updated');
});
