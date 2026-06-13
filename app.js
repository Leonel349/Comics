let mangaData = [];
let headersList = [];

function initLocalOnlyUI() {
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = "Please select a local CSV or XML file to begin...";
    document.getElementById('exportCsvButton').style.display = 'none';
    document.getElementById('exportXmlButton').style.display = 'none';
    showMissingFileAlert();
}

// MASTER FILE IMPORT INTERCEPTOR ROUTER
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const targetFile = files[0];

    addLog(`File loaded by local input: "${targetFile.name}" [Size: ${(targetFile.size / 1024).toFixed(2)} KB]`, 'info');
    updateUploadUI(targetFile.name);
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const fileContent = evt.target.result;
        addLog("File context buffer read completed successfully. Processing strings structural encoding format...", "info");
        
        // Wipe down older tables
        const container = document.querySelector('.table-container');
        container.innerHTML = `<table id="mangaTable"><thead><tr id="tableHeaders"></tr></thead><tbody></tbody></table>`;
        
        // ROUTING ENGINE: Route evaluation down based on true string format properties
        if (targetFile.name.toLowerCase().endsWith('.xml') || fileContent.trim().startsWith('<')) {
            addLog("XML file encoding profile matched. Injecting parsing pipeline routing rules...", "info");
            processXML(fileContent);
        } else {
            addLog("CSV standard flat data file matched. Injecting table cell delimiting engines...", "info");
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

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) {
        addLog("Failed to parse document: CSV file text structure is empty.", "error");
        return;
    }

    addLog(`Parsed ${rawLines.length - 1} data rows from flat spreadsheet stream. Building grid layers...`, 'success');
    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
    
    // CORREÇÃO AQUI: Pegamos apenas a linha 0 [0] antes de fazer o mapeamento (.map)
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

function processXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Safety handling against broken non-valid XML trees
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        addLog(`Malformed XML context parsing constraint: ${parserError.textContent}`, 'error');
        alert("Error parsing XML structure. Verify file integrity tags formatting rules.");
        return;
    }

    headersList = ['cover', 'hid', 'title', 'type', 'rating', 'origination', 'read', 'last_read', 'synonyms', 'mal', 'anilist', 'mangaupdates'];
    buildTableHeadersMarkup();

    mangaData = [];
    const mangaNodes = xmlDoc.getElementsByTagName("manga");
    addLog(`Discovered ${mangaNodes.length} structural <manga> items inside hierarchical XML map tree rows. Building objects...`, 'success');
    
    for (let i = 0; i < mangaNodes.length; i++) {
        const mangaNode = mangaNodes[i];
        let entry = {};
        
        headersList.forEach(header => {
            // CORREÇÃO: Buscamos a lista de elementos com a tag do cabeçalho
            const elementsFound = mangaNode.getElementsByTagName(header);
            
            // CORREÇÃO: Pegamos o primeiro elemento [0] se ele existir, e só então lemos o textContent
            let valueText = (elementsFound && elementsFound.length > 0) ? elementsFound[0].textContent.trim() : '';
            
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
    addLog(`Data table rows injection completely mapped onto interface node grids. Total items: ${mangaData.length}`, 'success');
    processCoversAndFallbacks(mangaData);
}

// Track export logs inside exporter module directly
function logExportAction(formatType) {
    addLog(`Compilation export requested. Compiling data memory map registry into layout schema: [.${formatType.toUpperCase()}]`, 'info');
    addLog(`File generation processing completely resolved. Initiating binary blob attachment file down download trigger...`, 'success');
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
