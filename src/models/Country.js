import { model, Schema } from 'mongoose';

const CountrySchema = new Schema(
  {
    name: {
      common: { type: String, required: true },
      official: { type: String, required: true },
      nativeName: {
        type: Map,
        of: {
          official: { type: String, required: true },
          common: { type: String, required: true }
        },
        required: false
      }
    },
    cca2: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2
    },
    flags: {
      png: { type: String, required: false },
      svg: { type: String, required: false },
      alt: { type: String, required: false }
    },
    // Legal consumer cooling-off / retraction period for this country, in
    // calendar days. null = unset, falls back to the 14-day EU standard
    // (Directive 2011/83/EU art. 9) wherever that delay is resolved.
    // No other country's figure is pre-filled here — a real legal value
    // must be entered deliberately, not guessed.
    retractionDays: { type: Number, default: null, min: 0 }
  },
  { timestamps: true }
);

// Index pour améliorer les performances de recherche (cca2 déjà indexé via unique: true)
CountrySchema.index({ 'name.common': 1 });
CountrySchema.index({ 'name.official': 1 });

const Country = model('Country', CountrySchema);

export default Country;
export { CountrySchema };
