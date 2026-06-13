let mangaData = [];
let headersList = [];

function initLocalOnlyUI() {
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = "Please select a local CSV or XML file to begin...";
    document.getElementById('exportCsvButton').style.display = 'none';
    document.getElementById('exportXmlButton').style.display = 'none';
    
    const container = document.querySelector('.table-container');
    container.innerHTML = `
        <div id="welcomeAlert" style="padding: 40px; text-align: center; color: #555; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
            📖 <strong>Library Ready</strong><br><br>
            <span style="font-size: 14px; color: #7f8c8d;">
                Click the <strong>📁 Load Local CSV / XML</strong> button above to render your database file securely.
            </span>
        </div>
    `;
}

// MASTER FILE IMPORT INTERCEPTOR ROUTER
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const targetFile = files[0];

    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = `Active: ${targetFile.name}`;
    
    // Unhide actions dashboard utilities buttons layout switches
    document.getElementById('exportCsvButton').style.display = 'inline-block';
    document.getElementById('exportXmlButton').style.display = 'inline-block';
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const fileContent = evt.target.result;
        
        // Wipe down older tables
        const container = document.querySelector('.table-container');
        container.innerHTML = `<table id="mangaTable"><thead><tr id="tableHeaders"></tr></thead><tbody></tbody></table>`;
        
        // ROUTING ENGINE: Route evaluation down based on true string format properties
        if (targetFile.name.toLowerCase().endsWith('.xml') || fileContent.trim().startsWith('<')) {
            processXML(fileContent);
        } else {
            processCSV(fileContent);
        }
    };
    reader.readAsText(targetFile);
});

function cleanId(value) {
    if (!value) return '';
    const matches = String(value).match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

// 1. STANDARD STREAMLINED CSV HANDLING SCHEMAS 
function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
    const rawHeaders = rawLines[0].map(h => String(h).trim().toLowerCase());

    buildTableHeadersMarkup();

    mangaData = [];
    for (let i = 1; i < rawLines.length; i++) {
        let values = rawLines[i];
        if (values.length < 2) continue;

        let entry = {};
        headersList.forEach((header) => {
            const csvIndex = rawHeaders.indexOf(header);
            if (header === 'cover') {
                const cellVal = (csvIndex !== -1 && values[csvIndex]) ? values[csvIndex].trim() : '';
                entry[header] = cellVal.startsWith('http') ? cellVal : '';
            } else {
                entry[header] = (csvIndex !== -1 && values[csvIndex] !== undefined) ? values[csvIndex].trim() : '';
            }
        });
        mangaData.push(entry);
    }
    completeProcessingPipeline();
}

// 2. NEW NATIVE XML COMPILATION SCHEMAS TREE DOM ELEMENT PARSER
function processXML(xmlText) {
    // Instantiate web standard internal DOM string element map parsing engines
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Explicit blueprint columns array matching strict alignment metrics
    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
    
    buildTableHeadersMarkup();

    mangaData = [];
    const mangaNodes = xmlDoc.getElementsByTagName("manga");
    
    for (let i = 0; i < mangaNodes.length; i++) {
        const mangaNode = mangaNodes[i];
        let entry = {};
        
        headersList.forEach(header => {
            const targetElement = mangaNode.getElementsByTagName(header)[0];
            let valueText = targetElement ? targetElement.textContent.trim() : '';
            
            if (header === 'cover') {
                entry[header] = valueText.startsWith('http') ? valueText : '';
            } else {
                entry[header] = valueText;
            }
        });
        mangaData.push(entry);
    }
    completeProcessingPipeline();
}

function buildTableHeadersMarkup() {
    const headersRow = document.getElementById('tableHeaders');
    headersRow.innerHTML = '';
    headersList.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.addEventListener('click', () => sortTableByColumn(header));
        headersRow.appendChild(th);
    });
    setupColumnCheckboxes();
}

function completeProcessingPipeline() {
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

// Launch layout themes and UI state flags directly on tab ready
initThemeMode();
initLocalOnlyUI();
