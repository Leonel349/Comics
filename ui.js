let currentSortColumn = null;
let isSortAscending = true;

const STORAGE_HIDDEN_COLS_KEY = 'comics_hidden_columns_registry';
const STORAGE_THEME_KEY = 'comics_active_visual_theme';

// CENTRALIZED MONITORING LIVE TERMINAL LOG ENGINE
function addLog(message, type = 'info') {
    const logConsole = document.getElementById('logConsoleOutput');
    if (!logConsole) return;

    const timestamp = new Date().toLocaleTimeString();
    const logRow = document.createElement('div');
    logRow.className = `log-row ${type}`;
    logRow.textContent = `[${timestamp}] > ${message}`;

    logConsole.appendChild(logRow);
    // Force scrolling box wrapper down to focus automatically on latest events entries
    logConsole.scrollTop = logConsole.scrollHeight;
}

// Clear system log button trigger hook
document.getElementById('clearLogBtn').addEventListener('click', () => {
    const logConsole = document.getElementById('logConsoleOutput');
    if (logConsole) logConsole.innerHTML = '<div class="log-row info">Logs cleared by user. Standby...</div>';
});

function getSavedHiddenColumns() {
    const saved = localStorage.getItem(STORAGE_HIDDEN_COLS_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveHiddenColumns(list) {
    localStorage.setItem(STORAGE_HIDDEN_COLS_KEY, JSON.stringify(list));
}

function initThemeMode() {
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    addLog(`Visual interface theme mode loaded: "${savedTheme}"`, 'info');
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_THEME_KEY, newTheme);
    addLog(`Theme mode swapped to: "${newTheme.toUpperCase()}"`, 'success');
});

function setupColumnCheckboxes() {
    const container = document.getElementById('checkboxContainer');
    container.innerHTML = '';
    const hiddenCols = getSavedHiddenColumns();

    headersList.forEach(header => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !hiddenCols.includes(header);
        checkbox.setAttribute('data-column', header);
        
        checkbox.addEventListener('change', (e) => {
            const hCols = getSavedHiddenColumns();
            if (!e.target.checked) {
                if (!hCols.includes(header)) hCols.push(header);
                addLog(`Column visibility altered: Hidden [${header}]`, 'warning');
            } else {
                const index = hCols.indexOf(header);
                if (index > -1) hCols.splice(index, 1);
                addLog(`Column visibility altered: Visible [${header}]`, 'success');
            }
            saveHiddenColumns(hCols);
            applyColumnVisibilityStates();
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(header));
        container.appendChild(label);
    });
    document.getElementById('columnToggleWrapper').style.display = 'block';
}

function applyColumnVisibilityStates() {
    const hiddenCols = getSavedHiddenColumns();
    headersList.forEach((header, index) => {
        const colIdx = index + 1;
        const ths = document.querySelectorAll(`#mangaTable th:nth-child(${colIdx})`);
        const tds = document.querySelectorAll(`#mangaTable td:nth-child(${colIdx})`);
        const shouldHide = hiddenCols.includes(header);
        
        ths.forEach(el => shouldHide ? el.classList.add('hidden-column') : el.classList.remove('hidden-column'));
        tds.forEach(el => shouldHide ? el.classList.add('hidden-column') : el.classList.remove('hidden-column'));
    });
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
                } else {
                    td.innerHTML = `<div class="cover-placeholder" id="placeholder-${index}">...</div>`;
                }
            } else if (header === 'mal' && val !== '' && val !== '-') {
                const idOnly = cleanId(val);
                // CORREÇÃO: Uso de crases (``) e rota correta da URL do MyAnimeList
                td.innerHTML = idOnly ? `<a class="mal-link" href="https://myanimelist.net{idOnly}" target="_blank">#${idOnly}</a>` : val;
            } else if (header === 'anilist' && val !== '' && val !== '-') {
                const idOnly = cleanId(val);
                // CORREÇÃO: Uso de crases (``) e rota correta da URL do AniList
                td.innerHTML = idOnly ? `<a class="mal-link" href="https://anilist.co{idOnly}" target="_blank">#${idOnly}</a>` : val;
            } else {
                td.textContent = val;
                if (header === 'title') td.className = 'title-column';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    applyColumnVisibilityStates(); 
}

function sortTableByColumn(columnName) {
    addLog(`Sorting dynamic records index list array by column header: [${columnName.toUpperCase()}]`, 'info');
    if (currentSortColumn === columnName) {
        isSortAscending = !isSortAscending;
    } else {
        currentSortColumn = columnName;
        isSortAscending = true;
    }

    mangaData.sort((a, b) => {
        let valA = String(a[columnName] || '').toLowerCase().trim();
        let valB = String(b[columnName] || '').toLowerCase().trim();

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return isSortAscending ? numA - numB : numB - numA;
        }

        if (valA < valB) return isSortAscending ? -1 : 1;
        if (valA > valB) return isSortAscending ? 1 : -1;
        return 0;
    });

    renderTable(mangaData);
    updateSortingGlyphs();
    addLog(`Table sorted sequentially [Direction: ${isSortAscending ? 'ASCENDING' : 'DESCENDING'}]`, 'success');
}

function updateSortingGlyphs() {
    const ths = document.querySelectorAll('#mangaTable th');
    ths.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.textContent.replace(/[🔼🔽]/g, '').trim().toLowerCase() === currentSortColumn) {
            th.classList.add(isSortAscending ? 'sort-asc' : 'sort-desc');
        }
    });
}

function updateTitleInDOM(rowIndex, newTitle) {
    const tr = document.querySelector(`tr:nth-child(${rowIndex + 1})`);
    const titleColIdx = headersList.indexOf('title');
    if (tr && titleColIdx !== -1) {
        tr.children[titleColIdx].innerHTML = `<strong>${newTitle}</strong>`;
    }
}

// Global runtime execution hooks exposed to app/api drivers
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
    document.getElementById('exportXmlButton').style.display = 'inline-block';
}

function showMissingFileAlert() {
    addLog("Error loading background files. Local only workspace mode configured.", "warning");
    document.querySelector('.table-container').innerHTML = `
        <div style="padding: 30px; text-align: center; color: #e74c3c; font-weight: bold; background: #fdf2f2; border-radius: 8px; border: 1px solid #f5c6cb;">
            📖 <strong>Local Workspace Mode Ready</strong><br><br>
            <span style="font-weight: normal; color: #555; font-size: 14px; display: block;">
                Select a local CSV or XML dataset file above to populate data records views.
            </span>
        </div>
    `;
}
