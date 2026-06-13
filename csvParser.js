// Native CSV parsing engine handles special quotes and inner-commas cleanly
function parseCSVLines(text) {
    if (!text) return [];
    
    let lines = [];
    let row = [""];
    let inQuotes = false;

    // Normalize any mixed Windows (\r\n) and Linux (\n) line breaks
    const normalizedText = text.replace(/\r\n/g, '\n');

    for (let i = 0; i < normalizedText.length; i++) {
        let c = normalizedText[i];
        let next = normalizedText[i+1];
        
        if (c === '"') {
            if (inQuotes && next === '"') { 
                row[row.length - 1] += '"'; 
                i++; 
            } else { 
                inQuotes = !inQuotes; 
            }
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if (c === '\n' && !inQuotes) {
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += c;
        }
    }
    
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        lines.push(row);
    }
    
    // CRUCIAL REPAIR LOGIC: If the first line merged headers and data because of a formatting defect, separate them
    if (lines.length > 0 && lines[0].length > 12) {
        console.warn("CSV Formatting defect detected! Separating merged headers and data row.");
        const mergedRow = lines[0];
        // Standard ComicK layout headers sequence mapping
        const standardHeaders = ['hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
        
        // Split the headers out and push the leftover data assets down as a new row entry
        lines[0] = mergedRow.slice(0, standardHeaders.length);
        const dataRowRemainder = mergedRow.slice(standardHeaders.length);
        if (dataRowRemainder.length > 0) {
            lines.splice(1, 0, dataRowRemainder);
        }
    }

    return lines;
}
