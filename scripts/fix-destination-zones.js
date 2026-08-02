import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_Matching';

// Define minimal schemas
const GigSchema = new mongoose.Schema({
    destination_zone: mongoose.Schema.Types.Mixed,
    title: String,
}, { strict: false });

const CountrySchema = new mongoose.Schema({
    name: mongoose.Schema.Types.Mixed,
    cca2: String,
    _id: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Gig = mongoose.model('Gig', GigSchema);
const Country = mongoose.model('Country', CountrySchema, 'countries');

async function fixInvalidDestinationZones() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // Find all gigs with invalid destination_zone (not 24 characters)
        const gigs = await Gig.find({
            destination_zone: { $exists: true, $ne: null }
        });

        console.log(`📋 Found ${gigs.length} gigs with destination_zone field`);

        let fixedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const gig of gigs) {
            const destZone = gig.destination_zone;

            // Check if it's already a valid ObjectId (24 hex characters)
            if (typeof destZone === 'string' && destZone.length === 24 && /^[a-f0-9]{24}$/i.test(destZone)) {
                console.log(`✓ Gig "${gig.title}" (${gig._id}) already has valid ObjectId: ${destZone}`);
                skippedCount++;
                continue;
            }

            // If it's a 2-character country code, try to find the country
            if (typeof destZone === 'string' && destZone.length === 2) {
                console.log(`🔍 Gig "${gig.title}" (${gig._id}) has country code: ${destZone}`);

                try {
                    const country = await Country.findOne({ cca2: destZone.toUpperCase() });

                    if (country) {
                        console.log(`  ✅ Found country: ${country.name.common || country.name} (${country._id})`);
                        gig.destination_zone = country._id.toString();
                        await gig.save();
                        console.log(`  💾 Updated gig destination_zone to: ${country._id}`);
                        fixedCount++;
                    } else {
                        console.log(`  ⚠️ Country not found for code: ${destZone}`);
                        // Try to find USA as fallback
                        const usCountry = await Country.findOne({ cca2: 'US' });
                        if (usCountry) {
                            gig.destination_zone = usCountry._id.toString();
                            await gig.save();
                            console.log(`  💾 Updated gig destination_zone to USA: ${usCountry._id}`);
                            fixedCount++;
                        } else {
                            console.log(`  ❌ Could not find fallback country`);
                            errorCount++;
                        }
                    }
                } catch (err) {
                    console.error(`  ❌ Error processing gig ${gig._id}:`, err.message);
                    errorCount++;
                }
            } else {
                console.log(`⚠️ Gig "${gig.title}" (${gig._id}) has unexpected destination_zone format: ${destZone}`);
                errorCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  ✅ Fixed: ${fixedCount}`);
        console.log(`  ✓ Already valid: ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📋 Total: ${gigs.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
fixInvalidDestinationZones()
    .then(() => {
        console.log('✅ Migration completed');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    });
