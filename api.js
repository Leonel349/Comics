function generateSecureUrl(endpointArray) {
    const protocol = 'https:';
    const host = ['api', 'jikan', 'moe'].join('.');
    return new URL(endpointArray.join('/'), `${protocol}//${host}/`);
}

function cleanId(value) {
    if (!value) return '';
    const matches = String(value).match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

async function processCoversAndFallbacks(data) {
    addLog(`API processing worker initialized. Analyzing ${data.length} total entries...`, 'info');
    let dynamicMatchesDiscovered = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let malId = cleanId(row.mal);
        const originalTitle = row.title || `Row Index #${i}`;

        // 1. FALLBACK IDENTIFIER RUN: Query missing IDs using title strings
        if (!malId && (row.title || row.synonyms)) {
            addLog(`Missing MAL reference code discovered for entry: "${originalTitle}". Launching search query...`, 'warning');
            const searchTerms = [row.title, ...(row.synonyms ? row.synonyms.split(';').map(s => s.trim()) : [])].filter(Boolean);
            
            for (let term of searchTerms) {
                if (term.length < 3) continue;
                try {
                    const searchUrl = generateSecureUrl(['v4', 'manga']);
                    searchUrl.searchParams.set('q', term);
                    searchUrl.searchParams.set('limit', '1');

                    const searchRes = await fetch(searchUrl.href);
                    if (searchRes.status === 429) { 
                        addLog("Rate limit (HTTP 429) hit! Backing off worker sequence for 2.5 seconds...", "error");
                        await new Promise(r => setTimeout(r, 2500)); 
                        continue; 
                    }
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        if (searchData.data && searchData.data.length > 0) {
                            malId = String(searchData.data.mal_id);
                            row.mal = malId;
                            updateMalLinkInDOM(i, malId);
                            addLog(`Found record match for "${originalTitle}" -> Assigned MAL ID #${malId}`, 'success');
                            dynamicMatchesDiscovered++;
                            break; 
                        }
                    }
                } catch (e) { console.warn(`Search drop: ${term}`, e); }
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 2. METADATA DEEP QUERY: Pull covers and enforce English translation title injections
        if (malId && !isNaN(malId)) {
            // Only search if missing translation metadata values or cover asset streams
            if (!row.cover) {
                try {
                    const coverUrl = generateSecureUrl(['v4', 'manga', malId]);
                    const response = await fetch(coverUrl.href);
                    
                    if (response.status === 429) {
                        addLog("Rate limit encountered! Backing off for 2.5s and repeating last line item...", "error");
                        await new Promise(r => setTimeout(r, 2500));
                        i--; continue;
                    }
                    
                    if (response.ok) {
                        const result = await response.json();
                        const targetNode = result.data;
                        
                        // Localized translation title handling switches
                        const englishTitle = targetNode?.title_english;
                        if (englishTitle && englishTitle.trim() !== '' && englishTitle.trim() !== row.title) {
                            addLog(`Localizing title text index [Row ${i+1}]: "${row.title}" -> "${englishTitle}"`, 'info');
                            row.title = englishTitle.trim();
                            updateTitleInDOM(i, row.title);
                        }

                        const img = targetNode?.images?.webp?.image_url || targetNode?.images?.jpg?.image_url;
                        if (img) {
                            row.cover = img;
                            injectCoverIntoDOM(i, img);
                        }
                    }
                } catch (err) { console.warn(`API deep resolution failed for ID #${malId}`, err); }
            } else {
                // If it already holds a valid data asset stream, render immediately skipping queries
                injectCoverIntoDOM(i, row.cover);
            }
        } else if (!malId) {
            clearPlaceholderInDOM(i);
        }
        await new Promise(r => setTimeout(r, 600));
    }
    addLog(`All background queue processes finalized cleanly. Discovered matches: ${dynamicMatchesDiscovered}`, 'success');
}
