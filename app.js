let mangaData = [];
let headersList = [];

// Fetch data automatically from repository paths
fetch('comick_list')
    .then(response => response.text())
    .then(csvText => processCSV(csvText))
    .catch(() => {
        fetch('/Comics/comick_list')
            .then(response => response.text())
            .then(csvText => processCSV(csvText))
            .catch(err => alert("Error: Target data backup file not detected in project path."));
    });

// Advanced regex helper to extract ONLY digits from any text or full link string
function cleanId(value) {
    if (!value) return '';
    const matches = value.match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

function processCSV(csvText) {
    const rawLines = parseCSVLines(csvText);
    if (rawLines.length < 1) return;

    // 1. Dynamic Header Assembly (Prepend custom cover frame item)
    headersList = rawLines.map(h => h.trim());
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

    // 2. Map raw values array to JavaScript object schemas
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

// Sequential worker targeting absolute API formatting paths explicitly
async function fetchCoversSequentially(data) {
    const rowsWithMal = data.map((row, idx) => ({row, idx})).filter(item => item.row.mal && item.row.mal !== '');

    for (let i = 0; i < rowsWithMal.length; i++) {
        const item = rowsWithMal[i];
        const malId = cleanId(item.row.mal);

        if (!malId || isNaN(malId)) continue; 

        try {
            // Standard direct Jikan API query endpoint
            const targetUrl = 'https://jikan.moe' + malId;
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
