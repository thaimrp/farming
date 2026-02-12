const Configuration = require('../model/configuration.model');
const ConfigurationType = require('../model/configuration-type.model');
const response = require('../helpers/response');
const AppError = require('../helpers/apperror');
const asyncHandler = require('../helpers/async.handler');

const ALLOWED_KEYS = ['typ_code', 'conf_code', 'conf_description', 'conf_value'];

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function buildFilter(source = {}) {
  const filter = {};
  for (const key of ALLOWED_KEYS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      const raw = String(source[key]).trim();
      filter[key] = key.endsWith('_code') ? raw.toUpperCase() : raw;
    }
  }
  return filter;
}

exports.listConfigurations = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const data = await Configuration.find(filter).sort({ typ_code: 1, conf_code: 1 });
  response.success(res, data, 'Configurations loaded');
});

exports.filterConfigurations = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.body || {});
  const data = await Configuration.find(filter).sort({ typ_code: 1, conf_code: 1 });
  response.success(res, data, 'Configurations loaded');
});

exports.createConfiguration = asyncHandler(async (req, res) => {
  const { typ_code, conf_code, conf_description, conf_value, options } = req.body || {};

  if (!typ_code || !conf_code || !conf_description) {
    throw new AppError('typ_code, conf_code and conf_description are required', 400, 'E_CFG_REQUIRED_FIELDS');
  }

  try {
    const doc = await Configuration.create({
      typ_code: normalizeCode(typ_code),
      conf_code: normalizeCode(conf_code),
      conf_description: String(conf_description).trim(),
      conf_value: conf_value !== undefined ? String(conf_value).trim() : '',
      options: Array.isArray(options)
        ? options.map((v) => String(v).trim()).filter(Boolean)
        : []
    });

    response.success(res, doc, 'Configuration created', 201);
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError('Configuration already exists', 409, 'E_CFG_DUPLICATE');
    }
    throw err;
  }
});

exports.updateConfiguration = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.body?.typ_code || req.body?.conf_code) {
    throw new AppError('Cannot change typ_code or conf_code', 400, 'E_CFG_IMMUTABLE_CODE');
  }

  const doc = await Configuration.findById(id);
  if (!doc) {
    throw new AppError('Configuration not found', 404, 'E_CFG_NOT_FOUND');
  }

  const { conf_description, conf_value, options } = req.body || {};
  if (conf_description !== undefined) doc.conf_description = String(conf_description).trim();
  if (conf_value !== undefined) doc.conf_value = String(conf_value).trim();
  if (options !== undefined) {
    doc.options = Array.isArray(options)
      ? options.map((v) => String(v).trim()).filter(Boolean)
      : [];
  }

  await doc.save();
  response.success(res, doc, 'Configuration updated');
});

exports.getTypes = asyncHandler(async (req, res) => {
  const items = await ConfigurationType.find({ status: 'ACTIVE' }).sort({ typ_code: 1 });
  response.success(res, items, 'Types loaded');
});
