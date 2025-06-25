// script.js - Full Editable Grid with Correct Data Types

// --- Global State ---
let allEpisodes = [];
let pendingChanges = {}; // E.g., { "episodeId123": { title: "New Title" } }
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

        // --- Helper to create a cell with a standard text/number input ---
        const createInputCell = (value, fieldName, type = 'text') => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = type;
            input.className = 'editable-input';
            input.value = value || '';
            input.placeholder = `Enter ${fieldName.replace('_', ' ')}`;
            cell.appendChild(input);
            input.addEventListener('input', () => trackChange(episode.id, fieldName, input.value));
            return cell;
        };

        // --- Helper to create a cell with a select dropdown ---
        const createSelectCell = (value, fieldName, options) => {
            const cell = row.insertCell();
            const select = document.createElement('select');
            select.className = 'editable-select';
            for (const [text, val] of Object.entries(options)) {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = text;
                if (val == value) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
            cell.appendChild(select);
            select.addEventListener('change', () => trackChange(episode.id, fieldName, select.value));
            return cell;
        };

        // --- Create a cell for a textarea ---
        const createTextareaCell = (value, fieldName) => {
            const cell = row.insertCell();
            const textarea = document.createElement('textarea');
            textarea.className = 'editable-textarea';
            textarea.value = value || '';
            textarea.placeholder = 'Enter summary...';
            textarea.rows = 2;
            cell.appendChild(textarea);
            textarea.addEventListener('input', () => trackChange(episode.id, fieldName, textarea.value));
            return cell;
        };
        
        // -- Render all cells using the new helpers --
        createInputCell(episode.title, 'title');

        // Description (Rich Text with Quill.js)
        const descCell = row.insertCell();
        const editorContainer = document.createElement('div');
        editorContainer.className = 'quill-editor-container';
        const editorEl = document.createElement('div');
        editorContainer.appendChild(editorEl);
        descCell.appendChild(editorContainer);
        const quill = new Quill(editorEl, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] } });
        quill.root.innerHTML = episode.content || '';
        quillInstances[episode.id] = quill;
        quill.on('text-change', () => trackChange(episode.id, 'content', quill.root.innerHTML));

        createInputCell(episode.season_no, 'season_no', 'number');
        createInputCell(episode.episode_no, 'episode_no', 'number');
        createSelectCell(episode.episode_type, 'episode_type', { 'Full': 'full', 'Trailer': 'trailer', 'Bonus': 'bonus' });
        createSelectCell(episode.content_explicit, 'content_explicit', { 'Clean': false, 'Explicit': true });
        createTextareaCell(episode.summary, 'summary');
        createInputCell(episode.author, 'author');

        // Action Cell with individual Save Button
        const actionCell = row.insertCell();
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn-individual';
        saveBtn.onclick = () => handleIndividualSave(episode.id);
        actionCell.appendChild(saveBtn);
    });
}

function trackChange(episodeId, field, value) {
    if (!pendingChanges[episodeId]) {
        pendingChanges[episodeId] = {};
    }
    pendingChanges[episodeId][field] = value;
    document.getElementById('save-all-btn').disabled = false;
    
    // Visually mark the row as having pending changes
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    if(row) row.classList.add('changed-row');
}

async function handleIndividualSave(episodeId) {
    // ... (This function is unchanged, it correctly sends the pendingChanges object)
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
    // ... (This function is also unchanged)
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
