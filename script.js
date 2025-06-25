// script.js - Final Version: Ensures all required fields and correct data types.

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

async function fetchWithAuth(url, options = {}) {
    const user = netlifyIdentity.currentUser();
    if (!user) throw new Error("User not logged in.");
    const headers = { ...options.headers, 'Authorization': `Bearer ${user.token.access_token}` };
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
    // Re-added Episode Type as it's required. It will be read-only.
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

        const createInputCell = (value, fieldName, type = 'text') => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = type;
            input.className = 'editable-input';
            input.value = value || '';
            input.dataset.field = fieldName;
            input.addEventListener('input', () => trackChange(episode.id, fieldName, input.value));
            cell.appendChild(input);
        };
        const createSelectCell = (value, fieldName, options) => {
            const cell = row.insertCell();
            const select = document.createElement('select');
            select.className = 'editable-select';
            select.dataset.field = fieldName;
            for (const [text, val] of Object.entries(options)) {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = text;
                if (String(val) === String(value)) option.selected = true;
                select.appendChild(option);
            }
            select.addEventListener('change', () => trackChange(episode.id, fieldName, select.value));
            cell.appendChild(select);
        };
        const createTextareaCell = (value, fieldName) => {
            const cell = row.insertCell();
            const textarea = document.createElement('textarea');
            textarea.className = 'editable-textarea';
            textarea.dataset.field = fieldName;
            textarea.value = value || '';
            textarea.addEventListener('input', () => trackChange(episode.id, fieldName, textarea.value));
            cell.appendChild(textarea);
        };
        
        createInputCell(episode.title, 'title');

        const descCell = row.insertCell();
        const editorPlaceholder = document.createElement('div');
        editorPlaceholder.id = `quill-editor-${episode.id}`;
        descCell.appendChild(editorPlaceholder);

        createInputCell(episode.season_no, 'season_no', 'number');
        createInputCell(episode.episode_no, 'episode_no', 'number');
        
        // Episode Type is now read-only text, but it's back in the table
        const typeCell = row.insertCell();
        typeCell.textContent = episode.episode_type || 'full';
        
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

    episodes.forEach(episode => {
        const editorNode = document.getElementById(`quill-editor-${episode.id}`);
        if (editorNode) {
            const quill = new Quill(editorNode, {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] }
            });
            quill.root.innerHTML = episode.content || '';
            quillInstances[episode.id] = quill;
            quill.on('text-change', () => trackChange(episode.id, 'content', quill.root.innerHTML));
        }
    });
}

function trackChange(episodeId, field, value) {
    if (!pendingChanges[episodeId]) {
        pendingChanges[episodeId] = {};
    }
    pendingChanges[episodeId][field] = value;
    
    document.getElementById('save-all-btn').disabled = false;
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    if(row) row.classList.add('changed-row');
}

/**
 * FINALIZED: Gathers changed data and ensures all required fields are always included.
 * @param {string} episodeId - The ID of the episode.
 * @returns {object} An object containing the data to be sent for update.
 */
function getDataToSave(episodeId) {
    const changes = pendingChanges[episodeId] || {};
    const originalEpisode = allEpisodes.find(ep => ep.id === episodeId);

    if (!originalEpisode) {
        console.error("Could not find original episode data for ID:", episodeId);
        return null;
    }
    
    // --- CRITICAL FIX: Start with a base of all required fields ---
    const updates = { 
        title: originalEpisode.title,
        status: originalEpisode.status,
        episode_type: originalEpisode.episode_type || 'full', // Always include episode_type
    };

    // Merge the tracked changes on top of the base.
    Object.assign(updates, changes);

    // Sanitize data types before sending
    for (const key in updates) {
        if (key === 'content_explicit') {
            updates[key] = String(updates[key] === 'true' || updates[key] === true);
        } else if ((key === 'season_no' || key === 'episode_no') && (updates[key] === '' || updates[key] === null)) {
            delete updates[key];
        }
    }
    
    return updates;
}


async function handleIndividualSave(episodeId) {
    const updates = getDataToSave(episodeId);
    
    if (!updates || !pendingChanges[episodeId] || Object.keys(pendingChanges[episodeId]).length === 0) {
        alert('No new changes to save for this episode.');
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
            throw new Error(errorData.error_description || `Save failed: ${errorData.error || 'Unknown error'}`);
        }

        saveButton.textContent = 'Saved!';
        row.classList.remove('changed-row');
        delete pendingChanges[episodeId];
        setTimeout(() => { saveButton.textContent = 'Save'; saveButton.disabled = false; }, 2000);

        if (Object.keys(pendingChanges).length === 0) {
            document.getElementById('save-all-btn').disabled = true;
        }

    } catch (error) {
        alert(`Error saving episode: ${error.message}`);
        saveButton.textContent = 'Retry';
        saveButton.disabled = false;
    }
}

async function handleSaveAll() {
    const saveAllBtn = document.getElementById('save-all-btn');
    const changedEpisodeIds = Object.keys(pendingChanges);
    if (changedEpisodeIds.length === 0) { alert('No changes to save.'); return; }

    saveAllBtn.textContent = 'Saving All...';
    saveAllBtn.disabled = true;
    let successCount = 0;
    const totalChanges = changedEpisodeIds.length;

    for (let i = 0; i < totalChanges; i++) {
        const episodeId = changedEpisodeIds[i];
        const updates = getDataToSave(episodeId);
        if (!updates) continue;
        
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
    saveAllBtn.disabled = true;
    await fetchEpisodes();
}
