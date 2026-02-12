const ConfigurationType = require('../model/configuration-type.model');
const response = require('../helpers/response');
const AppError = require('../helpers/apperror');
const asyncHandler = require('../helpers/async.handler');

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

exports.listConfigurationTypes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.typ_code) filter.typ_code = normalizeCode(req.query.typ_code);
  if (req.query.status) filter.status = String(req.query.status).trim().toUpperCase();

  const data = await ConfigurationType.find(filter).sort({ typ_code: 1 });
  response.success(res, data, 'Configuration types loaded');
});

exports.createConfigurationType = asyncHandler(async (req, res) => {
  const { typ_code, typ_description, status } = req.body || {};
  if (!typ_code || !typ_description) {
    throw new AppError('typ_code and typ_description are required', 400, 'E_CFG_TYPE_REQUIRED_FIELDS');
  }

  try {
    const doc = await ConfigurationType.create({
      typ_code: normalizeCode(typ_code),
      typ_description: String(typ_description).trim(),
      status: status ? String(status).trim().toUpperCase() : 'ACTIVE'
    });
    response.success(res, doc, 'Configuration type created', 201);
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError('Configuration type already exists', 409, 'E_CFG_TYPE_DUPLICATE');
    }
    throw err;
  }
});

exports.updateConfigurationType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await ConfigurationType.findById(id);
  if (!doc) throw new AppError('Configuration type not found', 404, 'E_CFG_TYPE_NOT_FOUND');

  if (req.body?.typ_code) {
    throw new AppError('Cannot change typ_code', 400, 'E_CFG_TYPE_IMMUTABLE_CODE');
  }

  const { typ_description, status } = req.body || {};
  if (typ_description !== undefined) doc.typ_description = String(typ_description).trim();
  if (status !== undefined) doc.status = String(status).trim().toUpperCase();

  await doc.save();
  response.success(res, doc, 'Configuration type updated');
});
