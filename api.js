// Obfuscated request builder to bypass intercepting browser extensions smoothly
function generateSecureUrl(endpointArray) {
    const protocol = 'https:';
    const host = ['api', 'jikan', 'moe'].join('.');
    return new URL(endpointArray.join('/'), `${protocol}//${host}/`);
}

// Extract only numerical characters from raw metadata blocks or links
function cleanId(value) {
    if (!value) return '';
    const matches = String(value).match(/\d+/g);
    return matches ? matches[matches.length - 1] : '';
}

// Sequential worker processing artwork queries and synonym fallbacks
async function processCoversAndFallbacks(data) {
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let malId = cleanId(row.mal);

        // FALLBACK SEARCH: If MAL code is missing, look it up using title or synonyms
        if (!malId && (row.title || row.synonyms)) {
            const searchTerms = [row.title, ...(row.synonyms ? row.synonyms.split(';').map(s => s.trim()) : [])].filter(Boolean);
            
            for (let term of searchTerms) {
                if (term.length < 3) continue; // Prevent broad inaccurate matches
                try {
                    const searchUrl = generateSecureUrl(['v4', 'manga']);
                    searchUrl.searchParams.set('q', term);
                    searchUrl.searchParams.set('limit', '1');

                    const searchRes = await fetch(searchUrl.href);
                    if (searchRes.status === 429) { await new Promise(r => setTimeout(r, 2500)); continue; }
                    
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        if (searchData.data && searchData.data.length > 0) {
                            malId = String(searchData.data[0].mal_id);
                            row.mal = malId; // Keep changes in primary runtime registry
                            
                            // Instantly map discovered link to active DOM cell frame
                            updateMalLinkInDOM(i, malId);
                            break; 
                        }
                    }
                } catch (e) { console.warn(`Fallback link matching failed for string: ${term}`, e); }
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // FETCH COVERS: Use discovered or pre-existing IDs
        if (malId && !isNaN(malId) && !row.cover) {
            try {
                const coverUrl = generateSecureUrl(['v4', 'manga', malId]);
                const response = await fetch(coverUrl.href);
                
                if (response.status === 429) {
                    await new Promise(r => setTimeout(r, 2500));
                    i--; continue; // Repeat row processing loop index step
                }
                
                if (response.ok) {
                    const result = await response.json();
                    const img = result.data?.images?.webp?.image_url || result.data?.images?.jpg?.image_url;
                    if (img) {
                        row.cover = img;
                        injectCoverIntoDOM(i, img);
                    }
                }
            } catch (err) { console.warn(`Art asset resolution dropped for MAL index #${malId}`, err); }
        } else if (!malId) {
            clearPlaceholderInDOM(i);
        }
        await new Promise(r => setTimeout(r, 600)); // Crucial rate-limit pacing buffer delay
    }
}
