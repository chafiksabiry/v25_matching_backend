import { MongoClient } from 'mongodb';

// MongoDB connection string for Railway
const MONGODB_URI = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/?authSource=admin';
const DB_NAME = 'harx';
const COLLECTION_NAME = 'languages';

async function importLanguages() {
    const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected successfully');

        // Fetch country data from REST Countries API to get languages
        console.log('\n📡 Fetching languages from REST Countries API...');
        const res = await fetch(
            'https://restcountries.com/v3.1/all?fields=languages'
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(`📊 Fetched data from ${data.length} countries`);

        const languageMap = new Map();

        // 1️⃣ Collect unique languages
        data.forEach(country => {
            if (!country.languages) return;

            Object.entries(country.languages).forEach(([code, name]) => {
                if (!languageMap.has(code)) {
                    languageMap.set(code, {
                        code: code.toUpperCase(), // Match model uppercase: true
                        name: name,
                        nativeName: name, // Fallback
                        isActive: true,
                        lastUpdated: new Date()
                    });
                }
            });
        });

        const languages = Array.from(languageMap.values());
        console.log(`💾 Importing ${languages.length} unique languages into MongoDB...`);

        // Get database and collection
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Create unique index on code to prevent duplicates
        await collection.createIndex({ code: 1 }, { unique: true });
        await collection.createIndex({ name: 1 }, { unique: true });

        // Use bulkWrite for better performance
        const bulkOps = languages.map(lang => ({
            updateOne: {
                filter: { code: lang.code },
                update: {
                    $set: lang,
                    $setOnInsert: { createdAt: new Date() },
                    $currentDate: { updatedAt: true }
                },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(bulkOps, { ordered: false });

        console.log('\n✅ Import completed successfully!');
        console.log(`   - Inserted: ${result.upsertedCount} languages`);
        console.log(`   - Updated: ${result.modifiedCount} languages`);
        console.log(`   - Matched: ${result.matchedCount} languages`);
        console.log(`   - Total: ${languages.length} languages processed`);

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
        await importLanguages();
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

main();
