let mangaData = [];
let headersList = [];

// 1. DYNAMIC FILE DISCOVERY: Check all common capitalization layouts automatically
const csvFilePossibilities = [
    'comick-mylist-2026-06-13.csv',
    'comick-mylist-2026-06-13.CSV',
    'comick-mylist.csv',
    'mangas.csv',
    'mangas.CSV'
];

async function loadCSVData() {
    let csvText = null;
    
    for (let fileName of csvFilePossibilities) {
        try {
            let response = await fetch(fileName);
            if (!response.ok) {
                response = await fetch(`/Comics/${fileName}`);
            }
            
            if (response.ok) {
                csvText = await response.text();
                console.log(`Successfully pulled data target: ${fileName}`);
                updateUploadUI(fileName);
                break;
            }
        } catch (e) {
            console.warn(`Path skipped: ${fileName}`);
        }
    }

    if (csvText) {
        processCSV(csvText);
    } else {
        showMissingFileAlert();
    }
}

function updateUploadUI(name) {
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = `Active file: ${name}`;
}

function showMissingFileAlert() {
    document.querySelector('.table-container').innerHTML = `
        <div style="padding: 30px; text-align: center; color: #e74c3c; font-weight: bold; background: #fdf2f2; border-radius: 8px; border: 1px solid #f5c6cb;">
            ⚠️ CSV Backup Data File Not Found on GitHub!<br><br>
            <span style="font-weight: normal; color: #555; font-size: 14px; display: block; margin-bottom: 15px;">
                The server could not read the file automatically. Make sure the name matches or use the button above to upload it directly.
            </span>
        </div>
    `;
}

// 2. MANUAL LOCAL FILE PICKER LOGIC
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    updateUploadUI(file.name);
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        // Re-inject the table container fallback markup in case it showed the error alert
        const container = document.querySelector('.table-container');
        if (container.querySelector('table') === null) {
            container.innerHTML = `<table id="mangaTable"><thead><tr id="tableHeaders"></tr></thead><tbody></tbody></table>`;
        }
        processCSV(evt.target.result);
    };
    reader.readAsText(file);
});

// Start checking the server path immediately
loadCSVData();

// Advanced regex helper to extract ONLY digits from any text or full link string
function cleanId(value) {
    if (!value) return '';
    const matches = value.match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    headersList = rawLines[0].map(h => h.trim());
    if (!headersList.includes('cover')) {
        headersList.unshift('cover');
    }

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
                entry[header] = ''; 
            } else {
                entry[header] = values[valueIdx] ? values[valueIdx].trim() : '';
                valueIdx++;
            }
        });
        mangaData.push(entry);
    }
    
    renderTable(mangaData);
    fetchCoversSequentially(mangaData);
}

function renderTable(data) {
    const tbody = document.querySelector('#mangaTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        headersList.forEach(header => {
            const td = document.createElement('td');
            let val = row[header] || '';

            if (header === 'cover') {
                if (val) {
                    td.innerHTML = `<img src="${val}" class="cover-img" alt="Cover">`;
                } else if (row['mal'] && cleanId(row['mal'])) {
                    td.innerHTML = `<div class="cover-placeholder" id="placeholder-${index}">...</div>`;
                } else {
                    td.innerHTML = `<div class="cover-placeholder">-</div>`;
                }
            } else if (header.toLowerCase() === 'mal' && val !== '') {
                const idOnly = cleanId(val);
                if (idOnly) {
                    td.innerHTML = `<a class="mal-link" href="https://myanimelist.net{idOnly}" target="_blank">#${idOnly}</a>`;
                } else {
                    td.textContent = val;
                }
            } else if (header.toLowerCase() === 'anilist' && val !== '') {
                const idOnly = cleanId(val);
                if (idOnly) {
                    td.innerHTML = `<a class="mal-link" href="https://anilist.co{idOnly}" target="_blank">#${idOnly}</a>`;
                } else {
                    td.textContent = val;
                }
            } else {
                td.textContent = val;
                if (header.toLowerCase() === 'title') td.className = 'title-column';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

async function fetchCoversSequentially(data) {
    const rowsWithMal = data.map((row, idx) => ({row, idx})).filter(item => item.row.mal && item.row.mal !== '');

    for (let i = 0; i < rowsWithMal.length; i++) {
        const item = rowsWithMal[i];
        const malId = cleanId(item.row.mal);

        if (!malId || isNaN(malId)) continue; 

        try {
            const targetUrl = 'https://jikan.moe/' + malId;
            const response = await fetch(targetUrl);
            
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                i--; 
                continue;
            }
            
            if (response.ok) {
                const result = await response.json();
                const imageUrl = result.data?.images?.webp?.image_url || result.data?.images?.jpg?.image_url;
                
                if (imageUrl) {
                    item.row.cover = imageUrl;
                    const placeholder = document.getElementById(`placeholder-${item.idx}`);
                    if (placeholder) {
                        placeholder.parentNode.innerHTML = `<img src="${imageUrl}" class="cover-img" alt="Cover">`;
                    }
                }
            }
        } catch (err) {
            console.warn(`Could not resolve artwork frame for MAL item #${malId}`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 600)); 
    }
}

document.getElementById('search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtered = mangaData.filter(row => {
        return Object.values(row).some(val => val.toLowerCase().includes(query));
    });
    renderTable(filtered);
});
