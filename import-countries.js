import { MongoClient } from 'mongodb';

// MongoDB connection string for Railway
const MONGODB_URI = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/?authSource=admin';
const DB_NAME = 'harx';
const COLLECTION_NAME = 'countries';

// Import countries from REST Countries API
async function importCountries() {
    const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected successfully');

        // Fetch country data from REST Countries API
        console.log('\n📡 Fetching countries from REST Countries API...');
        const res = await fetch(
            'https://restcountries.com/v3.1/all?fields=name,cca2,flags'
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(`📊 Fetched ${data.length} countries`);

        // Transform data to match your Country model
        const countries = data.map(c => ({
            name: {
                common: c.name?.common || '',
                official: c.name?.official || '',
                nativeName: c.name?.nativeName || {}
            },
            cca2: c.cca2 || '',
            flags: {
                png: c.flags?.png || '',
                svg: c.flags?.svg || '',
                alt: c.flags?.alt || ''
            }
        }));

        // Get database and collection
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        console.log('\n💾 Importing countries into MongoDB...');

        // Create unique index on cca2 to prevent duplicates
        await collection.createIndex({ cca2: 1 }, { unique: true });

        // Use bulkWrite for better performance
        const bulkOps = countries.map(country => ({
            updateOne: {
                filter: { cca2: country.cca2 },
                update: {
                    $set: country,
                    $setOnInsert: { createdAt: new Date() },
                    $currentDate: { updatedAt: true }
                },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(bulkOps, { ordered: false });

        console.log('\n✅ Import completed successfully!');
        console.log(`   - Inserted: ${result.upsertedCount} countries`);
        console.log(`   - Updated: ${result.modifiedCount} countries`);
        console.log(`   - Matched: ${result.matchedCount} countries`);
        console.log(`   - Total: ${countries.length} countries processed`);

        // Show some sample data
        console.log('\n📋 Sample countries imported:');
        const samples = await collection.find().limit(5).toArray();
        samples.forEach(country => {
            console.log(`   - ${country.name.common} (${country.cca2})`);
        });

    } catch (err) {
        console.error('\n❌ Error during import:', err);
        throw err;
    } finally {
        await client.close();
        console.log('\n🔌 MongoDB disconnected');
    }
}

// Main execution
async function main() {
    try {
        await importCountries();
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

main();
