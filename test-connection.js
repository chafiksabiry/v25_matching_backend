import { MongoClient } from 'mongodb';

const uri = 'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/?authSource=admin';

async function testConnection() {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected successfully');

        // List all databases
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();

        console.log('\n📚 Available databases:');
        dbs.databases.forEach(db => {
            console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });

        // Test write to a specific database
        const db = client.db('harx');
        const collection = db.collection('countries');

        console.log('\n✍️  Testing write operation...');
        const testDoc = {
            name: { common: 'Test', official: 'Test Country', nativeName: {} },
            cca2: 'XX',
            flags: { png: '', svg: '', alt: '' }
        };

        const result = await collection.insertOne(testDoc);
        console.log('✅ Write successful, inserted ID:', result.insertedId);

        // Clean up test document
        await collection.deleteOne({ cca2: 'XX' });
        console.log('🧹 Test document cleaned up');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected');
    }
}

testConnection();
