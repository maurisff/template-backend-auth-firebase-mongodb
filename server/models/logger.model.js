
const mongoose = require('mongoose');

const { Schema } = mongoose;

const SchemaTabela = new Schema({
  tipo: {
    type: String,
    required: 'tipo required',
  },
  file: {
    type: String,
  },
  log: {
    type: Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model('Logger', SchemaTabela);
