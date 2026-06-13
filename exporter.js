// Compiles memory arrays back into standard raw CSV strings
function exportToCsv() {
    if (mangaData.length === 0) return alert("No parsed data is available to generate file exports.");

    let csvRows = [];
    csvRows.push(headersList.join(','));

    mangaData.forEach(row => {
        const values = headersList.map(header => {
            const cellValue = row[header] || '';
            if (/[",\n\r]/.test(cellValue)) {
                return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
        });
        csvRows.push(values.join(','));
    });

    triggerBlobDownload(csvRows.join('\n'), 'comick-mylist.csv', 'text/csv');
}

// Converts layout memory objects cleanly into standard hierarchical XML tags
function exportToXml() {
    if (mangaData.length === 0) return alert("No parsed data is available to generate file exports.");

    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlString += '<myanimelist>\n';

    mangaData.forEach(row => {
        xmlString += '  <manga>\n';
        headersList.forEach(header => {
            // Ignore custom layout 'cover' column if it is empty to keep XML schemas clean
            if (header === 'cover' && !row[header]) return;
            
            let value = row[header] || '';
            // Escape core standard XML invalid characters to prevent broken tree outputs
            let cleanXmlValue = String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');

            xmlString += `    <${header}>${cleanXmlValue}</${header}>\n`;
        });
        xmlString += '  </manga>\n';
    });

    xmlString += '</myanimelist>';

    triggerBlobDownload(xmlString, 'comick-mylist.xml', 'text/xml');
}

// Generic file link generation utility module
function triggerBlobDownload(content, filename, contentType) {
    const blob = new Blob([content], { type: `${contentType};charset=utf-8;` });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Bind utilities directly onto button click handles
document.getElementById('exportCsvButton').addEventListener('click', exportToCsv);
document.getElementById('exportXmlButton').addEventListener('click', exportToXml);
