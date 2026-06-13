let mangaData = [];
let headersList = [];

const csvFilePossibilities = [
    'comick-mylist-2026-06-13.csv',
    'comick-mylist-2026-06-13.CSV',
    'comick-mylist.csv',
    'mangas.csv'
];

async function loadCSVData() {
    let csvText = null;
    for (let fileName of csvFilePossibilities) {
        try {
            let response = await fetch(fileName);
            if (!response.ok) response = await fetch(`/Comics/${fileName}`);
            if (response.ok) {
                csvText = await response.text();
                updateUploadUI(fileName);
                break;
            }
        } catch (e) { console.warn(`Path skip tracking evaluation element: ${fileName}`); }
    }
    if (csvText) processCSV(csvText);
    else showMissingFileAlert();
}

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    // 1. Parse raw headers exactly from row 0 and sanitize them to lowercase
    const rawHeaders = rawLines[0].map(h => h.trim().toLowerCase());
    
    // Enforce your precise exact column sequence layout safely
    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];

    // Direct structural dynamic building of functional table headers node layout
    const headersRow = document.getElementById('tableHeaders');
    headersRow.innerHTML = '';
    headersList.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.addEventListener('click', () => sortTableByColumn(header));
        headersRow.appendChild(th);
    });

    setupColumnCheckboxes();

    // 2. Map data rows dynamically matching strings directly by key names to prevent shift bugs
    mangaData = [];
    for (let i = 1; i < rawLines.length; i++) {
        let values = rawLines[i];
        if (values.length < 2) continue;

        let entry = {};
        
        // Loop through our strict header order configuration blueprint
        headersList.forEach((header) => {
            // Find where this header sits in the original CSV raw index array row layout
            const csvIndex = rawHeaders.indexOf(header);
            
            if (csvIndex !== -1 && values[csvIndex] !== undefined) {
                const cellVal = values[csvIndex].trim();
                // Clean image link string overrides
                if (header === 'cover') {
                    entry[header] = cellVal.startsWith('http') ? cellVal : '';
                } else {
                    entry[header] = cellVal;
                }
            } else {
                entry[header] = ''; // Safe empty fallback if column cell is blank or missing
            }
        });
        
        mangaData.push(entry);
    }
    
    renderTable(mangaData);
    processCoversAndFallbacks(mangaData);
}

document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files;
    if (!file) return;
    updateUploadUI(file.name);
    const reader = new FileReader();
    reader.onload = function(evt) {
        const container = document.querySelector('.table-container');
        if (!container.querySelector('table')) {
            container.innerHTML = `<table id="mangaTable"><thead><tr id="tableHeaders"></tr></thead><tbody></tbody></table>`;
        }
        processCSV(evt.target.result);
    };
    reader.readAsText(file);
});

document.getElementById('search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtered = mangaData.filter(row => {
        return Object.values(row).some(val => String(val).toLowerCase().includes(query));
    });
    renderTable(filtered);
});

// Bootstrap application layers immediately on DOM readiness
initThemeMode();
loadCSVData();
