const Mapping = require('../model/mapping.model');
const response = require('../helpers/response');
const AppError = require('../helpers/apperror');
const asyncHandler = require('../helpers/async.handler');

const ALLOWED_KEYS = ['map_type', 'map_prim_code', 'map_secd_code', 'description', 'value', 'status'];

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function buildFilter(source = {}) {
  const filter = {};
  for (const key of ALLOWED_KEYS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      const raw = String(source[key]).trim();
      filter[key] = key.includes('_code') || key === 'map_type' || key === 'status'
        ? raw.toUpperCase()
        : raw;
    }
  }
  return filter;
}

exports.listMappings = asyncHandler(async (req, res) => {
  const data = await Mapping.find(buildFilter(req.query)).sort({ map_type: 1, map_prim_code: 1, map_secd_code: 1 });
  response.success(res, data, 'Mappings loaded');
});

exports.filterMappings = asyncHandler(async (req, res) => {
  const data = await Mapping.find(buildFilter(req.body || {})).sort({ map_type: 1, map_prim_code: 1, map_secd_code: 1 });
  response.success(res, data, 'Mappings loaded');
});

exports.createMapping = asyncHandler(async (req, res) => {
  const { map_type, map_prim_code, map_secd_code, description, value, options, status } = req.body || {};
  if (!map_type || !map_prim_code || !map_secd_code) {
    throw new AppError('map_type, map_prim_code and map_secd_code are required', 400, 'E_MAP_REQUIRED_FIELDS');
  }

  try {
    const doc = await Mapping.create({
      map_type: normalizeCode(map_type),
      map_prim_code: normalizeCode(map_prim_code),
      map_secd_code: normalizeCode(map_secd_code),
      description: description !== undefined ? String(description).trim() : '',
      value: value !== undefined ? String(value).trim() : '',
      options: Array.isArray(options) ? options.map((v) => String(v).trim()).filter(Boolean) : [],
      status: status ? String(status).trim().toUpperCase() : 'ACTIVE'
    });
    response.success(res, doc, 'Mapping created', 201);
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError('Mapping already exists', 409, 'E_MAP_DUPLICATE');
    }
    throw err;
  }
});

exports.updateMapping = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.body?.map_type || req.body?.map_prim_code || req.body?.map_secd_code) {
    throw new AppError('Cannot change map_type/map_prim_code/map_secd_code', 400, 'E_MAP_IMMUTABLE_CODE');
  }

  const doc = await Mapping.findById(id);
  if (!doc) throw new AppError('Mapping not found', 404, 'E_MAP_NOT_FOUND');

  const { description, value, options, status } = req.body || {};
  if (description !== undefined) doc.description = String(description).trim();
  if (value !== undefined) doc.value = String(value).trim();
  if (options !== undefined) doc.options = Array.isArray(options) ? options.map((v) => String(v).trim()).filter(Boolean) : [];
  if (status !== undefined) doc.status = String(status).trim().toUpperCase();

  await doc.save();
  response.success(res, doc, 'Mapping updated');
});
