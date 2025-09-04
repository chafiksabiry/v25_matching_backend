import mongoose from 'mongoose';

const timezoneSchema = new mongoose.Schema({
  countryCode: {
    type: String,
    required: true,
    uppercase: true,
    length: 2
  },
  countryName: {
    type: String,
    required: true
  },
  zoneName: {
    type: String,
    required: true,
    unique: true
  },
  gmtOffset: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
timezoneSchema.index({ countryCode: 1 });
timezoneSchema.index({ zoneName: 1 });

// Middleware pour mettre à jour lastUpdated
timezoneSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Timezone = mongoose.model('Timezone', timezoneSchema);

export default Timezone;
