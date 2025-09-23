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
    }
  },
  { timestamps: true }
);

// Index pour améliorer les performances de recherche (cca2 déjà indexé via unique: true)
CountrySchema.index({ 'name.common': 1 });
CountrySchema.index({ 'name.official': 1 });

const Country = model('Country', CountrySchema);

export default Country;
export { CountrySchema };
