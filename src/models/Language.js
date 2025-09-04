import mongoose from 'mongoose';

const languageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  nativeName: {
    type: String,
    required: false
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  iso639_1: {
    type: String,
    required: false
  },
  iso639_2: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
languageSchema.index({ name: 1 });
languageSchema.index({ code: 1 });
languageSchema.index({ iso639_1: 1 });
languageSchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
languageSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Language = mongoose.model('Language', languageSchema);

export default Language;
