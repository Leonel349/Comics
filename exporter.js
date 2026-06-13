// Compiles database memory configurations cleanly back into escaped CSV file blobs
function exportToCsv() {
    if (mangaData.length === 0) return alert("No parsed data is available to generate file exports.");

    let csvRows = [];
    csvRows.push(headersList.join(',')); // Add raw headers string row up front

    mangaData.forEach(row => {
        const values = headersList.map(header => {
            const cellValue = row[header] || '';
            // Escape special inner quotes or comma constraints
            if (/[",\n\r]/.test(cellValue)) {
                return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
        });
        csvRows.push(values.join(','));
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvBlob);
    downloadLink.setAttribute('download', 'comick-mylist-2026-06-13.csv');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Bind down export execution click event trigger rules
document.getElementById('exportCsvButton').addEventListener('click', exportToCsv);
