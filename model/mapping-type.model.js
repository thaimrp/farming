const mongoose = require('mongoose');

const mappingTypeSchema = new mongoose.Schema(
  {
    map_type: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'mapping_types'
  }
);

module.exports = mongoose.model('MappingType', mappingTypeSchema);
