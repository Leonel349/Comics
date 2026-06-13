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

        // 1. FALLBACK IDENTIFIER RUN: Pesquisa TODOS os termos e vota no ID mais frequente
        if (!malId && (row.title || row.synonyms)) {
            addLog(`Missing MAL reference code discovered for entry: "${originalTitle}". Gathering all terms for voting pipeline...`, 'warning');
            
            // Cria a lista com o título e todos os sinônimos disponíveis
            const searchTerms = [row.title, ...(row.synonyms ? row.synonyms.split(';').map(s => s.trim()) : [])].filter(Boolean);
            const idVotes = {}; // Dicionário para computar os votos de cada ID encontrado: { "12345": 2, "67890": 1 }
            
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
                        // Diminui o contador do loop de termos para refazer a pesquisa deste mesmo termo de forma segura
                        searchTerms.unshift(term); 
                        continue; 
                    }
                    
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        if (searchData.data && searchData.data.length > 0) {
                            const foundId = String(searchData.data[0].mal_id);
                            // Registra o voto para o ID encontrado
                            idVotes[foundId] = (idVotes[foundId] || 0) + 1;
                        }
                    }
                } catch (e) { 
                    console.warn(`Search drop: ${term}`, e); 
                }
                // Pausa obrigatória entre requisições de termos para evitar sobrecarga na API
                await new Promise(r => setTimeout(r, 500));
            }

            // Processa o resultado da votação dos IDs coletados
            const votedIds = Object.keys(idVotes);
            if (votedIds.length > 0) {
                // Encontra o ID que obteve a maior contagem/repetição
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
                // Se o fluxo terminou e absolutamente nenhum ID foi retornado por nenhum termo
                malId = "-";
                row.mal = malId;
                updateMalLinkInDOM(i, malId);
                addLog(`No valid ID discovered across all synonyms for: "${originalTitle}". Field marked as "-"`, 'error');
            }
        }

        // 2. METADATA DEEP QUERY: Pull covers and enforce English translation title injections
        // Só avança se tiver um ID e se ele for estritamente numérico (evita rodar se malId for "-")
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
