// Render the complete visual grid data elements cleanly matching discovered column arrays
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
                } else {
                    td.innerHTML = `<div class="cover-placeholder" id="placeholder-${index}">...</div>`;
                }
            } else if (header.toLowerCase() === 'mal' && val !== '') {
                const idOnly = cleanId(val);
                td.innerHTML = idOnly ? `<a class="mal-link" href="https://myanimelist.net{idOnly}" target="_blank">#${idOnly}</a>` : val;
            } else if (header.toLowerCase() === 'anilist' && val !== '') {
                const idOnly = cleanId(val);
                td.innerHTML = idOnly ? `<a class="mal-link" href="https://anilist.co{idOnly}" target="_blank">#${idOnly}</a>` : val;
            } else {
                td.textContent = val;
                if (header.toLowerCase() === 'title') td.className = 'title-column';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Live precise DOM state injection updates
function updateMalLinkInDOM(rowIndex, malId) {
    const tr = document.querySelector(`tr:nth-child(${rowIndex + 1})`);
    const malColIdx = headersList.indexOf('mal');
    if (tr && malColIdx !== -1) {
        tr.children[malColIdx].innerHTML = `<a class="mal-link" href="https://myanimelist.net{malId}" target="_blank">#${malId}</a>`;
    }
}

function injectCoverIntoDOM(rowIndex, imgUrl) {
    const placeholder = document.getElementById(`placeholder-${rowIndex}`);
    if (placeholder) {
        placeholder.parentNode.innerHTML = `<img src="${imgUrl}" class="cover-img" alt="Cover">`;
    }
}

function clearPlaceholderInDOM(rowIndex) {
    const placeholder = document.getElementById(`placeholder-${rowIndex}`);
    if (placeholder) {
        placeholder.parentNode.innerHTML = `<div class="cover-placeholder">-</div>`;
    }
}

function updateUploadUI(name) {
    const display = document.getElementById('fileNameDisplay');
    if (display) display.textContent = `Active: ${name}`;
    document.getElementById('exportCsvButton').style.display = 'inline-block';
}

function showMissingFileAlert() {
    document.querySelector('.table-container').innerHTML = `
        <div style="padding: 30px; text-align: center; color: #e74c3c; font-weight: bold; background: #fdf2f2; border-radius: 8px; border: 1px solid #f5c6cb;">
            ⚠️ CSV Backup Data File Not Found on GitHub!<br><br>
            <span style="font-weight: normal; color: #555; font-size: 14px; display: block; margin-bottom: 15px;">
                The server could not read the file automatically. Use the file selection control above to map data locally.
            </span>
        </div>
    `;
}
