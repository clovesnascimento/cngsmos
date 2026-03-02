const { VectorSearchService } = require('./dist/services/VectorSearchService');
const path = require('path');
const fs = require('fs');

async function test() {
    const root = process.cwd();
    const service = new VectorSearchService(root);
    
    console.log('--- Inherent Index Rebuild ---');
    await service.rebuildIndex((p) => console.log(`Progress: ${p}%`));
    
    console.log('--- Search Test ---');
    const results = await service.search('VectorSearchService');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    const dbPath = path.join(root, '.cngsm', 'index', 'rag_memory.sqlite');
    if (fs.existsSync(dbPath)) {
        console.log('SUCCESS: SQLite Database created at', dbPath);
    } else {
        console.log('FAILURE: Database file not found.');
    }
}

test().catch(console.error);
