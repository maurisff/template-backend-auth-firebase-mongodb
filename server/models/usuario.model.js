
const mongoose = require('mongoose');

const { Schema } = mongoose;

const SchemaTabela = new Schema({
  email: {
    type: String,
    required: 'email é obrigatório',
    lowercase: true,
    trim: true,
  },
  nome: {
    type: String,
    required: 'Nome é Obrigatória',
  },
  uid: {
    type: String,
  },
  verificado: {
    type: Boolean,
    default: false,
  },
  admin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updateAt: {
    type: Date,
    default: Date.now,
  },
});
SchemaTabela.index({ email: 1 }, { unique: true });
SchemaTabela.index({ uid: 1 }, { unique: true });
module.exports = mongoose.model('Usuario', SchemaTabela);
