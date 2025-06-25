// script.js - Full Editable Grid with Quill Initialization Fix

// --- Global State ---
let allEpisodes = [];
let pendingChanges = {};
let quillInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    document.getElementById('save-all-btn').addEventListener('click', handleSaveAll);
});

async function initializeApp() {
    // ... (This function is unchanged)
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
    }
}

async function fetchEpisodes() {
    // ... (This function is unchanged)
    let fetchedEpisodes = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while(hasMore) {
        const response = await fetch(`/api/get-episodes?access_token=${window.podbeanAccessToken}&offset=${offset}&limit=${limit}`);
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error_description || 'Failed to fetch episodes.'); }
        const data = await response.json();
        if (data.episodes && data.episodes.length > 0) { fetchedEpisodes.push(...data.episodes); offset += data.episodes.length; } else { hasMore = false; }
    }
    allEpisodes = fetchedEpisodes;
    pendingChanges = {};
    document.getElementById('save-all-btn').disabled = true;
    renderEpisodes(allEpisodes);
}

/**
 * Renders an editable grid with appropriate input types for each field.
 * @param {Array} episodes - The array of episode objects.
 */
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

        // --- Create all cells and inputs first ---
        const createInputCell = (value, fieldName, type = 'text') => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = type;
            input.className = 'editable-input';
            input.value = value || '';
            input.placeholder = `Enter ${fieldName.replace('_', ' ')}`;
            input.addEventListener('input', () => trackChange(episode.id, fieldName, input.value));
            cell.appendChild(input);
        };

        const createSelectCell = (value, fieldName, options) => {
            const cell = row.insertCell();
            const select = document.createElement('select');
            select.className = 'editable-select';
            for (const [text, val] of Object.entries(options)) {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = text;
                if (val == value) option.selected = true;
                select.appendChild(option);
            }
            select.addEventListener('change', () => trackChange(episode.id, fieldName, select.value));
            cell.appendChild(select);
        };
        
        const createTextareaCell = (value, fieldName) => {
            const cell = row.insertCell();
            const textarea = document.createElement('textarea');
            textarea.className = 'editable-textarea';
            textarea.value = value || '';
            textarea.placeholder = 'Enter summary...';
            textarea.rows = 2;
            textarea.addEventListener('input', () => trackChange(episode.id, fieldName, textarea.value));
            cell.appendChild(textarea);
        };
        
        createInputCell(episode.title, 'title');

        // For Quill, create a placeholder div with a unique ID
        const descCell = row.insertCell();
        const editorPlaceholder = document.createElement('div');
        editorPlaceholder.id = `quill-editor-${episode.id}`;
        editorPlaceholder.className = 'quill-placeholder';
        editorPlaceholder.innerHTML = episode.content || ''; // Put initial content here
        descCell.appendChild(editorPlaceholder);

        createInputCell(episode.season_no, 'season_no', 'number');
        createInputCell(episode.episode_no, 'episode_no', 'number');
        createSelectCell(episode.episode_type, 'episode_type', { 'Full': 'full', 'Trailer': 'trailer', 'Bonus': 'bonus' });
        createSelectCell(episode.content_explicit, 'content_explicit', { 'Clean': false, 'Explicit': true });
        createTextareaCell(episode.summary, 'summary');
        createInputCell(episode.author, 'author');

        const actionCell = row.insertCell();
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn-individual';
        saveBtn.onclick = () => handleIndividualSave(episode.id);
        actionCell.appendChild(saveBtn);
    });

    // --- STEP 1: ADD THE FULLY BUILT TABLE TO THE DOM ---
    tableContainer.appendChild(table);

    // --- STEP 2: NOW THAT THE TABLE IS ON THE PAGE, INITIALIZE QUILL EDITORS ---
    episodes.forEach(episode => {
        const editorNode = document.getElementById(`quill-editor-${episode.id}`);
        if (editorNode) {
            const quill = new Quill(editorNode, {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] }
            });
            quillInstances[episode.id] = quill;
            quill.on('text-change', () => trackChange(episode.id, 'content', quill.root.innerHTML));
        }
    });
}

function trackChange(episodeId, field, value) {
    // ... (This function is unchanged)
    if (!pendingChanges[episodeId]) {
        pendingChanges[episodeId] = {};
    }
    pendingChanges[episodeId][field] = value;
    document.getElementById('save-all-btn').disabled = false;
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    if(row) row.classList.add('changed-row');
}

async function handleIndividualSave(episodeId) {
    // ... (This function is unchanged)
    const changes = pendingChanges[episodeId];
    if (!changes) { alert('No changes to save for this episode.'); return; }
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    const saveButton = row.querySelector('.save-btn-individual');
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    try {
        const response = await fetch('/api/update-episode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId, updates: changes, accessToken: window.podbeanAccessToken }),
        });
        if (!response.ok) throw new Error((await response.json()).error_description || 'Save failed');
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
    // ... (This function is unchanged)
    const saveAllBtn = document.getElementById('save-all-btn');
    const changedEpisodeIds = Object.keys(pendingChanges);
    if (changedEpisodeIds.length === 0) { alert('No changes to save.'); return; }
    saveAllBtn.textContent = 'Saving All...';
    saveAllBtn.disabled = true;
    let successCount = 0;
    const totalChanges = changedEpisodeIds.length;
    for (let i = 0; i < totalChanges; i++) {
        const episodeId = changedEpisodeIds[i];
        const updates = pendingChanges[episodeId];
        saveAllBtn.textContent = `Saving ${i + 1} of ${totalChanges}...`;
        try {
            const response = await fetch('/api/update-episode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId, updates, accessToken: window.podbeanAccessToken }),
            });
            if (response.ok) successCount++;
        } catch (error) { console.error(`Failed to save episode ${episodeId}:`, error); }
    }
    alert(`Successfully saved ${successCount} of ${totalChanges} episodes.`);
    saveAllBtn.textContent = 'Save All Changes';
    saveAllBtn.disabled = true;
    await fetchEpisodes();
}
