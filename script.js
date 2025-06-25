// script.js - Full Editable Grid Logic

// --- Global State ---
let allEpisodes = [];
let pendingChanges = {}; // E.g., { "episodeId123": { title: "New Title", hasChanged: true } }
let quillInstances = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    document.getElementById('save-all-btn').addEventListener('click', handleSaveAll);
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
    }
}

async function fetchEpisodes() {
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
    pendingChanges = {}; // Reset changes on fetch
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
    const headers = ['Title', 'Description', 'Season', 'Episode', 'Type', 'Summary', 'Author', 'Action'];
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

        // --- Create Editable Cells ---
        const createEditableCell = (value, fieldName) => {
            const cell = row.insertCell();
            cell.textContent = value || '';
            cell.contentEditable = true;
            cell.dataset.field = fieldName;
            cell.addEventListener('input', () => trackChange(episode.id, fieldName, cell.textContent));
            return cell;
        };
        
        createEditableCell(episode.title, 'title');

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

        // Other text fields
        createEditableCell(episode.season_no, 'season_no');
        createEditableCell(episode.episode_no, 'episode_no');
        createEditableCell(episode.episode_type, 'episode_type');
        createEditableCell(episode.summary, 'summary');
        createEditableCell(episode.author, 'author');

        // Action Cell with individual Save Button
        const actionCell = row.insertCell();
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn-individual';
        saveBtn.onclick = () => handleIndividualSave(episode.id);
        actionCell.appendChild(saveBtn);
    });

    tableContainer.appendChild(table);
}

function trackChange(episodeId, field, value) {
    if (!pendingChanges[episodeId]) {
        pendingChanges[episodeId] = {};
    }
    pendingChanges[episodeId][field] = value;
    document.getElementById('save-all-btn').disabled = false;
}

async function handleIndividualSave(episodeId) {
    const changes = pendingChanges[episodeId];
    if (!changes) {
        alert('No changes to save for this episode.');
        return;
    }
    
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
        delete pendingChanges[episodeId]; // Clear changes for this episode
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

    if (changedEpisodeIds.length === 0) {
        alert('No changes to save.');
        return;
    }

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
        } catch (error) {
            console.error(`Failed to save episode ${episodeId}:`, error);
        }
    }
    
    alert(`Successfully saved ${successCount} of ${totalChanges} episodes.`);
    saveAllBtn.textContent = 'Save All Changes';
    saveAllBtn.disabled = true; // Disable after saving
    await fetchEpisodes(); // Refresh the table with the latest data
}
