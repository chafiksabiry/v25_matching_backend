import mongoose, { Schema } from 'mongoose';

const currencySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    symbol: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'currencies'
  }
);

// Index pour améliorer les performances de recherche (code déjà indexé via unique: true)
currencySchema.index({ name: 1 });
currencySchema.index({ isActive: 1 });

const Currency = mongoose.model('Currency', currencySchema);

export default Currency;
export { currencySchema };
