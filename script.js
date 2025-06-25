// script.js - Client Credentials Flow with Episode Fetching (via Proxy)

document.addEventListener('DOMContentLoaded', () => {
    // This function runs as soon as the page is loaded
    initializeApp();
});

async function initializeApp() {
    const statusMessage = document.getElementById('status-message');
    const editorContainer = document.getElementById('editor-container');
    
    try {
        statusMessage.textContent = 'Authenticating...';
        
        const response = await fetch('/api/get-token');
        const tokenData = await response.json();

        if (!response.ok) {
            throw new Error(tokenData.error_description || 'Failed to authenticate.');
        }

        const accessToken = tokenData.access_token;
        window.podbeanAccessToken = accessToken; // Store token globally

        statusMessage.textContent = 'Authentication successful. Fetching episodes...';
        
        await fetchEpisodes(); // No need to pass token here anymore

        editorContainer.style.display = 'block';
        statusMessage.style.display = 'none';

    } catch (error) {
        statusMessage.style.color = 'red';
        statusMessage.textContent = `Error: ${error.message}`;
        console.error('Initialization failed:', error);
    }
}

/**
 * Fetches all episodes by calling our proxy function.
 */
async function fetchEpisodes() {
    const allEpisodes = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while(hasMore) {
        // --- THIS IS THE KEY CHANGE ---
        // Call our own backend proxy instead of Podbean directly.
        const response = await fetch(`/api/get-episodes?access_token=${window.podbeanAccessToken}&offset=${offset}&limit=${limit}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'Failed to fetch episodes.');
        }

        const data = await response.json();

        if (data.episodes && data.episodes.length > 0) {
            allEpisodes.push(...data.episodes);
            offset += data.episodes.length;
        } else {
            hasMore = false;
        }
    }

    renderEpisodes(allEpisodes);
}

/**
 * Renders the list of episodes into an HTML table.
 * @param {Array} episodes - The array of episode objects.
 */
function renderEpisodes(episodes) {
    const episodeListDiv = document.getElementById('episode-list');
    
    episodeListDiv.innerHTML = '';

    if (episodes.length === 0) {
        episodeListDiv.textContent = 'No episodes found.';
        return;
    }

    const table = document.createElement('table');
    table.className = 'episode-table';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Title', 'Status', 'Published Date'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    episodes.forEach(episode => {
        const row = tbody.insertRow();
        
        const titleCell = row.insertCell();
        titleCell.textContent = episode.title;

        const statusCell = row.insertCell();
        statusCell.textContent = episode.status;

        const dateCell = row.insertCell();
        const publishDate = new Date(episode.publish_time * 1000);
        dateCell.textContent = publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    });

    episodeListDiv.appendChild(table);
}
