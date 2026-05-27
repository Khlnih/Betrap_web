function transformQuery(text) {
    text = text.replace(/GETDATE\(\)/g, 'CURRENT_TIMESTAMP');
    text = text.replace(/ISNULL\(/g, 'COALESCE(');
    if (text.includes('OUTPUT INSERTED.')) {
        const outputMatch = text.match(/OUTPUT INSERTED\.([a-zA-Z0-9_]+)/);
        if (outputMatch) {
            const col = outputMatch[1];
            text = text.replace(/OUTPUT INSERTED\.[a-zA-Z0-9_]+\s+/g, '');
            text = text + ` RETURNING ${col}`;
        }
    }
    return text;
}

console.log(transformQuery(`INSERT INTO Users (Id, Email) OUTPUT INSERTED.Id VALUES ($1, $2)`));
console.log(transformQuery(`UPDATE Users SET UpdatedAt=GETDATE() WHERE Id=$1`));
