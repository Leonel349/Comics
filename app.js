// Main global application runtime data states register
let mangaData = [];
let headersList = [];

const csvFilePossibilities = [
    'comick-mylist-2026-06-13.csv',
    'comick-mylist-2026-06-13.CSV',
    'comick-mylist.csv',
    'mangas.csv'
];

// Orchestrator processing network loading lookup pipeline configurations
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
        } catch (e) { console.warn(`Path mapping evaluation skipped for target file: ${fileName}`); }
    }
    if (csvText) processCSV(csvText);
    else showMissingFileAlert();
}

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    headersList = rawLines[0].map(h => h.trim());
    if (!headersList.includes('cover')) {
        headersList.unshift('cover');
    }

    // Build header layout nodes out dynamically via UI module layers
    const headersRow = document.getElementById('tableHeaders');
    headersRow.innerHTML = '';
    headersList.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headersRow.appendChild(th);
    });

    mangaData = [];
    for (let i = 1; i < rawLines.length; i++) {
        let values = rawLines[i];
        if (values.length < 2) continue;

        let entry = {};
        let valueIdx = 0;
        headersList.forEach((header) => {
            if (header === 'cover') {
                // If it already holds an asset string pointer leave it, else create blank item
                entry[header] = values[0] && (values[0].startsWith('http') || values[0] === '') ? values[0] : ''; 
            } else {
                entry[header] = values[valueIdx] ? values[valueIdx].trim() : '';
                valueIdx++;
            }
        });
        mangaData.push(entry);
    }
    
    renderTable(mangaData);
    processCoversAndFallbacks(mangaData);
}

// Attach manual upload interaction handles
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
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

// Live input search string matching hook listeners
document.getElementById('search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtered = mangaData.filter(row => {
        return Object.values(row).some(val => String(val).toLowerCase().includes(query));
    });
    renderTable(filtered);
});

// Initialize the data fetching application layer immediately on startup
loadCSVData();
