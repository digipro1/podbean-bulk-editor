// script.js - Now with editor logic

// --- Global State ---
let allEpisodes = []; // To store the fetched episodes
let pendingChanges = []; // To store episodes that will be updated

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // --- Event Listeners for Editor Controls ---
    document.getElementById('preview-btn').addEventListener('click', previewChanges);
    // The 'Save' button listener will be added in the next step
});

async function initializeApp() {
    const statusMessage = document.getElementById('status-message');
    const editorContainer = document.getElementById('editor-container');
    
    try {
        statusMessage.textContent = 'Authenticating...';
        const response = await fetch('/api/get-token');
        const tokenData = await response.json();
        if (!response.ok) throw new Error(tokenData.error_description || 'Failed to authenticate.');
        window.podbeanAccessToken = tokenData.access_token;
        statusMessage.textContent = 'Authentication successful. Fetching episodes...';
        await fetchEpisodes();
        editorContainer.style.display = 'block';
        statusMessage.style.display = 'none';
    } catch (error) {
        statusMessage.style.color = 'red';
        statusMessage.textContent = `Error: ${error.message}`;
        console.error('Initialization failed:', error);
    }
}

async function fetchEpisodes() {
    let fetchedEpisodes = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while(hasMore) {
        const response = await fetch(`/api/get-episodes?access_token=${window.podbeanAccessToken}&offset=${offset}&limit=${limit}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'Failed to fetch episodes.');
        }
        const data = await response.json();
        if (data.episodes && data.episodes.length > 0) {
            fetchedEpisodes.push(...data.episodes);
            offset += data.episodes.length;
        } else {
            hasMore = false;
        }
    }
    // Store globally and render
    allEpisodes = fetchedEpisodes;
    renderEpisodes(allEpisodes);
}

/**
 * Finds episodes matching the 'find' text and stages them for preview.
 */
function previewChanges() {
    const findText = document.getElementById('find-input').value;
    const replaceText = document.getElementById('replace-input').value;
    const saveBtn = document.getElementById('save-btn');

    if (!findText) {
        // Using a more user-friendly modal/alert in a real app would be better
        alert('Please enter text to find.');
        return;
    }

    // Reset previous changes
    pendingChanges = [];

    allEpisodes.forEach(episode => {
        if (episode.title.includes(findText)) {
            // Using replaceAll to handle multiple occurrences in one title
            const newTitle = episode.title.replaceAll(findText, replaceText);
            // Add to pending changes with a new property for the new title
            pendingChanges.push({
                ...episode,
                new_title: newTitle 
            });
        }
    });

    if (pendingChanges.length > 0) {
        saveBtn.disabled = false;
        // Optionally, provide feedback on how many changes are staged
        console.log(`${pendingChanges.length} changes are staged.`);
    } else {
        saveBtn.disabled = true;
        alert('No episodes found with that text.');
    }
    
    // Re-render the table to show the preview
    renderEpisodes(allEpisodes);
}


/**
 * Renders the list of episodes, highlighting any pending changes.
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
        const pending = pendingChanges.find(p => p.id === episode.id);

        // Title cell
        const titleCell = row.insertCell();
        if (pending) {
            row.classList.add('pending-change');
            // Using innerHTML to render the styled spans
            titleCell.innerHTML = `
                <span class="original-text">${episode.title}</span>
                <span class="new-text">${pending.new_title}</span>
            `;
        } else {
            titleCell.textContent = episode.title;
        }

        // Status cell
        const statusCell = row.insertCell();
        statusCell.textContent = episode.status;

        // Published Date cell
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
