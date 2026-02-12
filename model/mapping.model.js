const mongoose = require('mongoose');

const mappingSchema = new mongoose.Schema(
  {
    map_type: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    map_prim_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    map_secd_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    value: {
      type: String,
      default: '',
      trim: true
    },
    options: {
      type: [String],
      default: []
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
    collection: 'mappings'
  }
);

// one relation per type+primary+secondary
mappingSchema.index({ map_type: 1, map_prim_code: 1, map_secd_code: 1 }, { unique: true });

module.exports = mongoose.model('Mapping', mappingSchema);
