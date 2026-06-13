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

    headersList = rawLines[0].map(h => h.trim());
    if (!headersList.includes('cover')) {
        headersList.unshift('cover');
    }

    // Direct structural dynamic building of functional table headers
    const headersRow = document.getElementById('tableHeaders');
    headersRow.innerHTML = '';
    headersList.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        // Bind dynamic alpha-sorting evaluation triggers directly onto the element headers click
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
