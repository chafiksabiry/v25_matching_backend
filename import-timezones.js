import { MongoClient } from 'mongodb';

// MongoDB connection string for Railway
const MONGODB_URI = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/?authSource=admin';
const DB_NAME = 'harx';
const COLLECTION_NAME = 'timezones';
const API_KEY = 'MLOUKSOHKJJY';

async function importTimezones() {
    const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected successfully');

        // Fetch timezone data from TimezoneDB API
        console.log(`\n📡 Fetching timezones from TimezoneDB API...`);
        const res = await fetch(
            `https://api.timezonedb.com/v2.1/list-time-zone?key=${API_KEY}&format=json`
        );

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.status !== 'OK') {
            throw new Error(`API Error: ${data.message}`);
        }

        console.log(`📊 Fetched ${data.zones.length} timezones`);

        // Transform data
        const timezones = data.zones.map(zone => ({
            countryCode: zone.countryCode.toUpperCase(),
            countryName: zone.countryName,
            zoneName: zone.zoneName,
            gmtOffset: Number(zone.gmtOffset),
            lastUpdated: new Date()
        }));

        console.log(`💾 Importing ${timezones.length} timezones into MongoDB...`);

        // Get database and collection
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Create unique index on zoneName to prevent duplicates
        await collection.createIndex({ zoneName: 1 }, { unique: true });
        await collection.createIndex({ countryCode: 1 });

        // Use bulkWrite for better performance
        const bulkOps = timezones.map(zone => ({
            updateOne: {
                filter: { zoneName: zone.zoneName },
                update: {
                    $set: zone,
                    $setOnInsert: { createdAt: new Date() },
                    $currentDate: { updatedAt: true }
                },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(bulkOps, { ordered: false });

        console.log('\n✅ Import completed successfully!');
        console.log(`   - Inserted: ${result.upsertedCount} timezones`);
        console.log(`   - Updated: ${result.modifiedCount} timezones`);
        console.log(`   - Matched: ${result.matchedCount} timezones`);
        console.log(`   - Total: ${timezones.length} timezones processed`);

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
        await importTimezones();
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

main();
