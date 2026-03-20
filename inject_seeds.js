const fs = require('fs');
const path = require('path');

const seedsPath = path.join(__dirname, 'card_seeds.sql');
const schemaPath = path.join(__dirname, 'supabase/migration/09_unified_schema.sql');

const seeds = fs.readFileSync(seedsPath, 'utf8');
let schema = fs.readFileSync(schemaPath, 'utf8');

// The replacement logic: Find the SEED DATA section and replace the INSERT block
const startMarker = '-- 10. SEED DATA: CARD TEMPLATES (Summary)';
const endMarker = '-- Initial Room';

const startIndex = schema.indexOf(startMarker);
const endIndex = schema.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const head = schema.substring(0, startIndex + startMarker.length);
    const tail = schema.substring(endIndex);

    const newSchema = head + '\n\n' + seeds + '\n\n' + tail;
    fs.writeFileSync(schemaPath, newSchema);
    console.log('Successfully injected 400 cards into 09_unified_schema.sql');
} else {
    console.error('Could not find marker markers in the schema file.');
    process.exit(1);
}
