function generateSecureUrl(endpointArray) {
    const protocol = 'https:';
    const host = ['api', 'jikan', 'moe'].join('.');
    return new URL(endpointArray.join('/'), `${protocol}//${host}/`);
}

// FUNÇÕES DE MANIPULAÇÃO DO DOM CORRIGIDAS E PROTEGIDAS CONTRA SUBSTITUIÇÃO DO CABEÇALHO
function updateMalLinkInDOM(rowIndex, malId) {
    const tbody = document.getElementById('mangaTableBody') || document.querySelector('#mangaTable tbody');
    if (!tbody) return;
    const row = tbody.children[rowIndex]; // Mira com segurança absoluta na linha correta dos dados
    if (!row) return;
    
    const malIndex = headersList.indexOf('mal');
    if (malIndex !== -1 && row.children[malIndex]) {
        const cell = row.children[malIndex];
        cell.innerHTML = malId && malId !== '-' ? `<a class="mal-link" href="https://myanimelist.net{malId}" target="_blank">#${malId}</a>` : malId;
    }
}

function updateTitleInDOM(rowIndex, title) {
    const tbody = document.getElementById('mangaTableBody') || document.querySelector('#mangaTable tbody');
    if (!tbody) return;
    const row = tbody.children[rowIndex];
    if (!row) return;

    const titleIndex = headersList.indexOf('title');
    if (titleIndex !== -1 && row.children[titleIndex]) {
        row.children[titleIndex].textContent = title;
    }
}

function injectCoverIntoDOM(rowIndex, imgUrl) {
    const tbody = document.getElementById('mangaTableBody') || document.querySelector('#mangaTable tbody');
    if (!tbody) return;
    const row = tbody.children[rowIndex];
    if (!row) return;

    const coverIndex = headersList.indexOf('cover');
    if (coverIndex !== -1 && row.children[coverIndex]) {
        row.children[coverIndex].innerHTML = `<img src="${imgUrl}" class="cover-img" alt="Cover">`;
    }
}

function clearPlaceholderInDOM(rowIndex) {
    const tbody = document.getElementById('mangaTableBody') || document.querySelector('#mangaTable tbody');
    if (!tbody) return;
    const row = tbody.children[rowIndex];
    if (!row) return;

    const coverIndex = headersList.indexOf('cover');
    if (coverIndex !== -1 && row.children[coverIndex]) {
        row.children[coverIndex].textContent = 'No Image';
    }
}

async function processCoversAndFallbacks(data) {
    addLog(`API processing worker initialized. Analyzing ${data.length} total entries...`, 'info');
    let dynamicMatchesDiscovered = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let malId = cleanId(row.mal);
        const originalTitle = row.title || `Row Index #${i}`;

        // 1. FALLBACK IDENTIFIER RUN: Pesquisa TODOS os termos e vota no ID mais frequente
        if (!malId && (row.title || row.synonyms)) {
            addLog(`Missing MAL reference code discovered for entry: "${originalTitle}". Gathering all terms for voting pipeline...`, 'warning');
            
            const searchTerms = [row.title, ...(row.synonyms ? row.synonyms.split(';').map(s => s.trim()) : [])].filter(Boolean);
            const idVotes = {}; 
            
            // Mudança para loop clássico indexado para contornar problemas de repetição segura no Rate Limit
            for (let t = 0; t < searchTerms.length; t++) {
                const term = searchTerms[t];
                if (term.length < 3) continue;
                try {
                    const searchUrl = generateSecureUrl(['v4', 'manga']);
                    searchUrl.searchParams.set('q', term);
                    searchUrl.searchParams.set('limit', '1');

                    const searchRes = await fetch(searchUrl.href);
                    if (searchRes.status === 429) { 
                        addLog("Rate limit (HTTP 429) hit! Backing off worker sequence for 2.5 seconds...", "error");
                        await new Promise(r => setTimeout(r, 2500)); 
                        t--; // Decrementa com segurança para tentar o mesmo termo de forma limpa
                        continue; 
                    }
                    
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        // CORREÇÃO: Verificação segura para evitar erros do tipo "Cannot read properties of undefined"
                        if (searchData.data && searchData.data.length > 0 && searchData.data[0].mal_id) {
                            const foundId = String(searchData.data[0].mal_id);
                            idVotes[foundId] = (idVotes[foundId] || 0) + 1;
                        }
                    }
                } catch (e) { 
                    console.warn(`Search drop: ${term}`, e); 
                }
                await new Promise(r => setTimeout(r, 500));
            }

            const votedIds = Object.keys(idVotes);
            if (votedIds.length > 0) {
                let winnerId = votedIds[0];
                for (let id of votedIds) {
                    if (idVotes[id] > idVotes[winnerId]) {
                        winnerId = id;
                    }
                }
                
                malId = winnerId;
                row.mal = malId;
                updateMalLinkInDOM(i, malId);
                addLog(`Voting resolved for "${originalTitle}" -> Winner MAL ID #${malId} (Votes: ${idVotes[winnerId]})`, 'success');
                dynamicMatchesDiscovered++;
            } else {
                malId = "-";
                row.mal = malId;
                updateMalLinkInDOM(i, malId);
                addLog(`No valid ID discovered across all synonyms for: "${originalTitle}". Field marked as "-"`, 'error');
            }
        }

        // 2. METADATA DEEP QUERY: Pull covers and enforce English translation title injections
        if (malId && !isNaN(malId)) {
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
                } catch (err) { 
                    console.warn(`API deep resolution failed for ID #${malId}`, err); 
                }
            } else {
                injectCoverIntoDOM(i, row.cover);
            }
        } else if (!malId || malId === "-") {
            clearPlaceholderInDOM(i);
        }
        await new Promise(r => setTimeout(r, 600));
    }
    addLog(`All background queue processes finalized cleanly. Discovered matches: ${dynamicMatchesDiscovered}`, 'success');
}
