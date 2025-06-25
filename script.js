// script.js - Final Version with Corrected Save Logic

// --- Global State ---
let allEpisodes = [];
let pendingChanges = {};
let quillInstances = {}; 
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- Netlify Identity Event Listeners ---
    netlifyIdentity.on('init', user => {
        currentUser = user;
        netlifyIdentity.renderPlaceholder('#auth-container');
    });

    netlifyIdentity.on('login', user => {
        currentUser = user;
        netlifyIdentity.close();
        initializeApp();
    });

    netlifyIdentity.on('logout', () => {
        currentUser = null;
        document.getElementById('app-container').style.display = 'none';
    });
    
    // Check if a user is already logged in when the page loads
    const user = netlifyIdentity.currentUser();
    if (user) {
        currentUser = user;
        initializeApp();
    }
});

function setupEventListeners() {
    const saveAllBtn = document.getElementById('save-all-btn');
    if(saveAllBtn) {
        saveAllBtn.addEventListener('click', handleSaveAll);
    }
}

// --- NEW HELPER FUNCTION FOR AUTHENTICATED FETCH ---
async function fetchWithAuth(url, options = {}) {
    const user = netlifyIdentity.currentUser();
    if (!user) {
        throw new Error("User not logged in.");
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${user.token.access_token}`
    };

    return fetch(url, { ...options, headers });
}


async function initializeApp() {
    const appContainer = document.getElementById('app-container');
    const statusMessage = appContainer.querySelector('#status-message');
    const editorContainer = appContainer.querySelector('#editor-container');
    
    appContainer.style.display = 'block';

    try {
        statusMessage.textContent = 'Authenticating with Podbean...';
        statusMessage.style.display = 'block';
        editorContainer.style.display = 'none';

        const response = await fetchWithAuth('/api/get-token');
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error || 'Could not get Podbean token. Please re-login.');
        }
        const tokenData = await response.json();
        window.podbeanAccessToken = tokenData.access_token;
        
        statusMessage.textContent = 'Authentication successful. Fetching episodes...';
        
        await fetchEpisodes();

        editorContainer.style.display = 'block';
        statusMessage.style.display = 'none';
        
        setupEventListeners();

    } catch (error) {
        statusMessage.style.color = 'red';
        statusMessage.textContent = `Error: ${error.message}`;
    }
}

async function fetchEpisodes() {
    let fetchedEpisodes = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while(hasMore) {
        const response = await fetchWithAuth(`/api/get-episodes?access_token=${window.podbeanAccessToken}&offset=${offset}&limit=${limit}`);
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error_description || 'Failed to fetch episodes.'); }
        const data = await response.json();
        if (data.episodes && data.episodes.length > 0) { fetchedEpisodes.push(...data.episodes); offset += data.episodes.length; } else { hasMore = false; }
    }
    allEpisodes = fetchedEpisodes;
    pendingChanges = {};
    document.getElementById('save-all-btn').disabled = true;
    renderEpisodes(allEpisodes);
}

function renderEpisodes(episodes) {
    const tableContainer = document.getElementById('table-container');
    tableContainer.innerHTML = '';
    quillInstances = {}; 

    if (episodes.length === 0) { tableContainer.textContent = 'No episodes found.'; return; }

    const table = document.createElement('table');
    table.className = 'episode-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Title', 'Description', 'Season', 'Episode', 'Episode Type', 'Content Rating', 'Summary', 'Author', 'Action'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        if (text === 'Description') th.style.width = '30%';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    episodes.forEach(episode => {
        const row = tbody.insertRow();
        row.dataset.episodeId = episode.id;

        // Helper functions now just create the inputs, they don't add listeners
        const createInputCell = (value, fieldName, type = 'text') => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = type;
            input.className = 'editable-input';
            input.value = value || '';
            input.dataset.field = fieldName; // Identify field
            input.placeholder = `Enter ${fieldName.replace('_', ' ')}`;
            cell.appendChild(input);
        };
        const createSelectCell = (value, fieldName, options) => {
            const cell = row.insertCell();
            const select = document.createElement('select');
            select.className = 'editable-select';
            select.dataset.field = fieldName; // Identify field
            for (const [text, val] of Object.entries(options)) {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = text;
                if (String(val) === String(value)) option.selected = true;
                select.appendChild(option);
            }
            cell.appendChild(select);
        };
        const createTextareaCell = (value, fieldName) => {
            const cell = row.insertCell();
            const textarea = document.createElement('textarea');
            textarea.className = 'editable-textarea';
            textarea.dataset.field = fieldName; // Identify field
            textarea.value = value || '';
            textarea.placeholder = 'Enter summary...';
            textarea.rows = 2;
            cell.appendChild(textarea);
        };
        
        createInputCell(episode.title, 'title');

        const descCell = row.insertCell();
        const editorPlaceholder = document.createElement('div');
        editorPlaceholder.id = `quill-editor-${episode.id}`;
        descCell.appendChild(editorPlaceholder);

        createInputCell(episode.season_no, 'season_no', 'number');
        createInputCell(episode.episode_no, 'episode_no', 'number');
        createSelectCell(episode.episode_type, 'episode_type', { 'Full': 'full', 'Trailer': 'trailer', 'Bonus': 'bonus' });
        createSelectCell(episode.content_explicit, 'content_explicit', { 'Clean': 'false', 'Explicit': 'true' });
        createTextareaCell(episode.summary, 'summary');
        createInputCell(episode.author, 'author');

        const actionCell = row.insertCell();
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn-individual';
        saveBtn.onclick = () => handleIndividualSave(episode.id);
        actionCell.appendChild(saveBtn);
    });

    tableContainer.appendChild(table);

    // Initialize Quill editors after the table is in the DOM
    episodes.forEach(episode => {
        const editorNode = document.getElementById(`quill-editor-${episode.id}`);
        if (editorNode) {
            const quill = new Quill(editorNode, {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] }
            });
            quill.root.innerHTML = episode.content || '';
            quillInstances[episode.id] = quill;
        }
    });
}

// This function is no longer needed as we read values directly on save.
// function trackChange(...) {}

/**
 * NEW: Collects all current values from a specific table row.
 * @param {string} episodeId - The ID of the episode's row to read from.
 * @returns {object} An object containing all editable field values.
 */
function getRowData(episodeId) {
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    if (!row) return null;

    const rowData = {};
    // Get values from all standard inputs and textareas
    row.querySelectorAll('[data-field]').forEach(input => {
        rowData[input.dataset.field] = input.value;
    });

    // Get content specifically from the Quill editor
    const quill = quillInstances[episodeId];
    if (quill) {
        rowData.content = quill.root.innerHTML;
    }

    return rowData;
}


async function handleIndividualSave(episodeId) {
    const updates = getRowData(episodeId);
    if (!updates) {
        alert('Could not find row data to save.');
        return;
    }
    
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    const saveButton = row.querySelector('.save-btn-individual');
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    try {
        const response = await fetchWithAuth('/api/update-episode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId, updates, accessToken: window.podbeanAccessToken }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'Save failed');
        }

        saveButton.textContent = 'Saved!';
        setTimeout(() => { saveButton.textContent = 'Save'; saveButton.disabled = false; }, 2000);

    } catch (error) {
        alert(`Error saving episode: ${error.message}`);
        saveButton.textContent = 'Retry';
        saveButton.disabled = false;
    }
}

async function handleSaveAll() {
    const saveAllBtn = document.getElementById('save-all-btn');
    const allRows = document.querySelectorAll('.episode-table tbody tr');

    if (allRows.length === 0) { alert('No episodes to save.'); return; }
    
    saveAllBtn.textContent = 'Saving All...';
    saveAllBtn.disabled = true;
    let successCount = 0;
    const totalChanges = allRows.length;

    for (let i = 0; i < totalChanges; i++) {
        const row = allRows[i];
        const episodeId = row.dataset.episodeId;
        const updates = getRowData(episodeId);
        
        saveAllBtn.textContent = `Saving ${i + 1} of ${totalChanges}...`;
        
        try {
            const response = await fetchWithAuth('/api/update-episode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId, updates, accessToken: window.podbeanAccessToken }),
            });
            if (response.ok) successCount++;
        } catch (error) { 
            console.error(`Failed to save episode ${episodeId}:`, error);
        }
    }
    
    alert(`Successfully saved ${successCount} of ${totalChanges} episodes.`);
    saveAllBtn.textContent = 'Save All Changes';
    saveAllBtn.disabled = false; // Re-enable after saving
    await fetchEpisodes(); // Refresh all data
}
