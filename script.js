// script.js - Final Version with Correct Auth Headers

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

        // --- UPDATED: Use the new authenticated fetch helper ---
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
        // --- UPDATED: Use the authenticated fetch helper ---
        // Note: We don't need to pass the token to the function itself, as it's handled by fetchWithAuth
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

        const descCell = row.insertCell();
        const editorPlaceholder = document.createElement('div');
        editorPlaceholder.id = `quill-editor-${episode.id}`;
        editorPlaceholder.className = 'quill-placeholder';
        editorPlaceholder.innerHTML = episode.content || '';
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

    tableContainer.appendChild(table);

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
    if (!pendingChanges[episodeId]) {
        pendingChanges[episodeId] = {};
    }
    pendingChanges[episodeId][field] = value;
    document.getElementById('save-all-btn').disabled = false;
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    if(row) row.classList.add('changed-row');
}

async function handleIndividualSave(episodeId) {
    const changes = pendingChanges[episodeId];
    if (!changes) { alert('No changes to save for this episode.'); return; }
    const row = document.querySelector(`tr[data-episode-id="${episodeId}"]`);
    const saveButton = row.querySelector('.save-btn-individual');
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    try {
        // --- UPDATED: Use the authenticated fetch helper ---
        const response = await fetchWithAuth('/api/update-episode', {
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
            // --- UPDATED: Use the authenticated fetch helper ---
            const response = await fetchWithAuth('/api/update-episode', {
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
