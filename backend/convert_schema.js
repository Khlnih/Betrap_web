const fs = require('fs');

let schema = fs.readFileSync('schema.sql', 'utf8');

// Convert Data Types
schema = schema.replace(/\bDATETIME\b/g, 'TIMESTAMP');
schema = schema.replace(/\bGETDATE\(\)/g, 'CURRENT_TIMESTAMP');
schema = schema.replace(/\bBIT\b/g, 'BOOLEAN');
schema = schema.replace(/\bNVARCHAR\b/g, 'VARCHAR');
schema = schema.replace(/\bNVARCHAR\(MAX\)\b/g, 'TEXT');

// Convert FOREIGN KEY inline syntax
schema = schema.replace(/\bFOREIGN KEY REFERENCES\b/g, 'REFERENCES');

// Convert N'string' to 'string'
schema = schema.replace(/N'([^']*)'/g, "'$1'");

// Remove GO
schema = schema.replace(/^GO\s*$/gm, '');

fs.writeFileSync('schema_pg.sql', schema);
console.log('schema_pg.sql generated.');
