let mangaData = [];
let headersList = [];

// 1. INIT CONTROL PANEL: Set up the UI to wait for local user files instantly
function initLocalOnlyUI() {
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = "Please select a local CSV file to begin...";
    document.getElementById('exportCsvButton').style.display = 'none';
    
    // Clear out any old data from previous renders
    const container = document.querySelector('.table-container');
    container.innerHTML = `
        <div id="welcomeAlert" style="padding: 40px; text-align: center; color: #555; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
            📖 <strong>Library Ready</strong><br><br>
            <span style="font-size: 14px; color: #7f8c8d;">
                Click the <strong>📁 Load Local CSV</strong> button above to render your database file securely.
            </span>
        </div>
    `;
}

// 2. LOCAL FILE PICKER EVENT HANDLER
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const files = e.target.files;
    
    // Safeguard check to ensure a file was actually chosen
    if (!files || files.length === 0) return;
    const targetFile = files[0];

    // Update control tracking UI titles
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = `Active: ${targetFile.name}`;
    document.getElementById('exportCsvButton').style.display = 'inline-block';
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        // Prepare table containers inside document object model layout frames
        const container = document.querySelector('.table-container');
        container.innerHTML = `
            <table id="mangaTable">
                <thead>
                    <tr id="tableHeaders"></tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        processCSV(evt.target.result);
    };
    reader.readAsText(targetFile);
});

// Advanced regex helper to extract ONLY digits from any text or full link string
function cleanId(value) {
    if (!value) return '';
    const matches = String(value).match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    // Force your exact, standardized sequence tracking list array setup
    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
    const rawHeaders = rawLines[0].map(h => String(h).trim().toLowerCase());

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
        
        headersList.forEach((header) => {
            if (header === 'cover') {
                const csvIndex = rawHeaders.indexOf('cover');
                const cellVal = (csvIndex !== -1 && values[csvIndex]) ? values[csvIndex].trim() : '';
                entry[header] = cellVal.startsWith('http') ? cellVal : '';
            } else {
                const csvIndex = rawHeaders.indexOf(header);
                if (csvIndex !== -1 && values[csvIndex] !== undefined) {
                    entry[header] = values[csvIndex].trim();
                } else {
                    entry[header] = '';
                }
            }
        });
        
        mangaData.push(entry);
    }
    
    renderTable(mangaData);
    processCoversAndFallbacks(mangaData);
}

document.getElementById('search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtered = mangaData.filter(row => {
        return Object.values(row).some(val => String(val).toLowerCase().includes(query));
    });
    renderTable(filtered);
});

// Run theme modules initialization layouts and prepare input pipelines
initThemeMode();
initLocalOnlyUI();
