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

    // Direct header extraction matching your precise tracking properties sequence
    headersList = rawLines[0].map(h => h.trim().toLowerCase());
    
    // Safety check: ensure 'cover' is present at the very beginning of the index registry
    if (headersList.length > 0 && headersList[0] !== 'cover') {
        if (headersList.includes('cover')) {
            // If it exists somewhere else, remove it so we can push it to index 0
            headersList = headersList.filter(h => h !== 'cover');
        }
        headersList.unshift('cover');
    }

    // Direct structural dynamic building of functional table headers
    const headersRow = document.getElementById('tableHeaders');
    headersRow.innerHTML = '';
    headersList.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.addEventListener('click', () => sortTableByColumn(header));
        headersRow.appendChild(th);
    });

    setupColumnCheckboxes();

    mangaData = [];
    for (let i = 1; i < rawLines.length; i++) {
        let values = rawLines[i];
        if (values.length < 2) continue;

        let entry = {};
        let valueIdx = 0;
        
        headersList.forEach((header) => {
            if (header === 'cover') {
                // Check if row entry string value is already an online HTTP image link string path
                const possibleImg = values[0] ? values[0].trim() : '';
                entry[header] = (possibleImg.startsWith('http')) ? possibleImg : '';
                // Only step the column reader index forward if 'cover' was native to the CSV text layout
                if (rawLines[0].map(h=>h.trim().toLowerCase()).startsWith && rawLines[0][0].trim().toLowerCase() === 'cover') {
                    valueIdx++;
                }
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
