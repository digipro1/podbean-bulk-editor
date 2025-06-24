// script.js - Client Credentials Flow with Episode Fetching

document.addEventListener('DOMContentLoaded', () => {
    // This function runs as soon as the page is loaded
    initializeApp();
});

async function initializeApp() {
    const statusMessage = document.getElementById('status-message');
    const editorContainer = document.getElementById('editor-container');
    
    try {
        statusMessage.textContent = 'Authenticating...';
        
        // 1. Call our new backend function to get a token
        const response = await fetch('/api/get-token');
        const tokenData = await response.json();

        if (!response.ok) {
            throw new Error(tokenData.error_description || 'Failed to authenticate.');
        }

        const accessToken = tokenData.access_token;

        statusMessage.textContent = 'Authentication successful. Fetching episodes...';
        
        // 3. Call the function to fetch and display the episodes
        await fetchEpisodes(accessToken);

        // Show the editor and hide the status message
        editorContainer.style.display = 'block';
        statusMessage.style.display = 'none';

    } catch (error) {
        statusMessage.style.color = 'red';
        statusMessage.textContent = `Error: ${error.message}`;
        console.error('Initialization failed:', error);
    }
}

/**
 * Fetches all episodes from the Podbean API, handling pagination.
 * @param {string} accessToken - The access token for API calls.
 */
async function fetchEpisodes(accessToken) {
    const allEpisodes = [];
    let offset = 0;
    const limit = 100; // Max episodes per request
    let hasMore = true;

    while(hasMore) {
        const response = await fetch(`https://api.podbean.com/v1/episodes?access_token=${accessToken}&offset=${offset}&limit=${limit}`);
        
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
    
    // Clear any previous content
    episodeListDiv.innerHTML = '';

    if (episodes.length === 0) {
        episodeListDiv.textContent = 'No episodes found.';
        return;
    }

    const table = document.createElement('table');
    table.className = 'episode-table'; // For future styling

    // Create table header
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Title', 'Status', 'Published Date'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Create table body
    const tbody = table.createTBody();
    episodes.forEach(episode => {
        const row = tbody.insertRow();
        
        // Title cell
        const titleCell = row.insertCell();
        titleCell.textContent = episode.title;

        // Status cell
        const statusCell = row.insertCell();
        statusCell.textContent = episode.status;

        // Published Date cell
        const dateCell = row.insertCell();
        // The publish_time is a Unix timestamp, so we multiply by 1000 for JavaScript
        const publishDate = new Date(episode.publish_time * 1000);
        dateCell.textContent = publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    });

    episodeListDiv.appendChild(table);
}
