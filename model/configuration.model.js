const mongoose = require('mongoose');

const configurationSchema = new mongoose.Schema(
  {
    typ_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    conf_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    conf_description: {
      type: String,
      required: true,
      trim: true
    },
    conf_value: {
      type: String,
      default: '',
      trim: true
    },
    options: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'configurations'
  }
);

configurationSchema.index({ typ_code: 1, conf_code: 1 }, { unique: true });

module.exports = mongoose.model('Configuration', configurationSchema);
