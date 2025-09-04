import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 2
  },
  nativeName: {
    type: String,
    required: false
  },
  flag: {
    type: String,
    required: false
  },
  currency: {
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
countrySchema.index({ name: 1 });
countrySchema.index({ code: 1 });
countrySchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
countrySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Country = mongoose.model('Country', countrySchema);

export default Country;
