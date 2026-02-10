import { MongoClient } from 'mongodb';

// MongoDB connection string for Railway
const MONGODB_URI = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/?authSource=admin';
const DB_NAME = 'harx';
const COLLECTION_NAME = 'currencies';

async function importCurrencies() {
    const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected successfully');

        // Fetch currency data from REST Countries API
        console.log('\n📡 Fetching countries from REST Countries API...');
        const res = await fetch(
            'https://restcountries.com/v3.1/all?fields=currencies'
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(`📊 Fetched ${data.length} countries`);

        const currencyMap = new Map();

        // 1️⃣ Collect unique currencies
        data.forEach(country => {
            if (!country.currencies) return;

            Object.entries(country.currencies).forEach(([code, cur]) => {
                if (!currencyMap.has(code)) {
                    currencyMap.set(code, {
                        code: code.toUpperCase(),
                        name: cur.name,
                        symbol: cur.symbol || '',
                        isActive: true
                    });
                }
            });
        });

        const currencies = Array.from(currencyMap.values());
        console.log(`💾 Importing ${currencies.length} currencies into MongoDB...`);

        // Get database and collection
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Create unique index on code to prevent duplicates
        await collection.createIndex({ code: 1 }, { unique: true });

        // Use bulkWrite for better performance
        const bulkOps = currencies.map(currency => ({
            updateOne: {
                filter: { code: currency.code },
                update: {
                    $set: currency,
                    $setOnInsert: { createdAt: new Date() },
                    $currentDate: { updatedAt: true }
                },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(bulkOps, { ordered: false });

        console.log('\n✅ Import completed successfully!');
        console.log(`   - Inserted: ${result.upsertedCount} currencies`);
        console.log(`   - Updated: ${result.modifiedCount} currencies`);
        console.log(`   - Matched: ${result.matchedCount} currencies`);
        console.log(`   - Total: ${currencies.length} currencies processed`);

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
        await importCurrencies();
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

main();
