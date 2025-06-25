// script.js - Full Editable Grid Logic

// --- Global State ---
let allEpisodes = [];
// Use an object for easier lookup by ID. E.g., { "episodeId123": { title: "New Title" } }
let pendingChanges = {}; 
let quillInstances = {}; // To store instances of the rich text editor

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    document.getElementById('preview-btn').addEventListener('click', previewChanges);
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
    renderEpisodes(allEpisodes);
}

/**
 * Renders an editable grid for all episodes.
 * @param {Array} episodes - The array of episode objects.
 */
function renderEpisodes(episodes) {
    const episodeListDiv = document.getElementById('episode-list');
    episodeListDiv.innerHTML = '';
    quillInstances = {}; // Clear old instances

    if (episodes.length === 0) { episodeListDiv.textContent = 'No episodes found.'; return; }

    const table = document.createElement('table');
    table.className = 'episode-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Title', 'Description', 'Season', 'Episode', 'Type', 'Summary', 'Author'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.width = text === 'Description' ? '35%' : 'auto';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    episodes.forEach(episode => {
        const row = tbody.insertRow();
        const epChanges = pendingChanges[episode.id] || {};

        // Helper to create a standard input cell
        const createInputCell = (value, fieldName) => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'editable-input';
            input.value = epChanges[fieldName] !== undefined ? epChanges[fieldName] : (value || '');
            input.dataset.episodeId = episode.id;
            input.dataset.field = fieldName;
            if (epChanges[fieldName] !== undefined) input.classList.add('pending');
            cell.appendChild(input);
        };
        
        // --- Create Cells for Each Column ---
        createInputCell(episode.title, 'title');
        
        // Description (Rich Text)
        const descCell = row.insertCell();
        const editorContainer = document.createElement('div');
        editorContainer.className = 'quill-editor-container';
        const editorEl = document.createElement('div');
        editorContainer.appendChild(editorEl);
        descCell.appendChild(editorContainer);
        
        const quill = new Quill(editorEl, {
            theme: 'snow',
            modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] }
        });
        // Podbean uses 'content' for the description
        quill.root.innerHTML = epChanges.content !== undefined ? epChanges.content : (episode.content || '');
        quillInstances[episode.id] = quill; // Store instance for later
        
        if (epChanges.content !== undefined) editorContainer.classList.add('pending');
        
        quill.on('editor-change', () => {
             editorContainer.classList.toggle('focused', quill.hasFocus());
        });

        // Season No., Episode No., Episode Type
        createInputCell(episode.season_no, 'season_no');
        createInputCell(episode.episode_no, 'episode_no');
        createInputCell(episode.episode_type, 'episode_type');
        createInputCell(episode.summary, 'summary');
        createInputCell(episode.author, 'author');
    });

    episodeListDiv.appendChild(table);
}

function previewChanges() {
    const fieldToEdit = document.getElementById('field-select').value;
    const findText = document.getElementById('find-input').value;
    const replaceText = document.getElementById('replace-input').value;
    const saveBtn = document.getElementById('save-btn');

    if (!findText) { alert('Please enter text to find.'); return; }
    
    let changesMade = false;
    pendingChanges = {}; // Reset changes for a new preview

    allEpisodes.forEach(episode => {
        // Handle both simple text fields and the Quill editor's content
        let originalText = '';
        if (fieldToEdit === 'content') {
            const quill = quillInstances[episode.id];
            originalText = quill ? quill.getText() : (episode.content || '');
        } else {
            originalText = episode[fieldToEdit] || '';
        }

        if (originalText.includes(findText)) {
            changesMade = true;
            const newText = originalText.replaceAll(findText, replaceText);

            pendingChanges[episode.id] = {
                ...pendingChanges[episode.id], // Keep other potential manual changes
                [fieldToEdit]: newText
            };
        }
    });

    saveBtn.disabled = !changesMade;
    if (!changesMade) {
        alert('No episodes found with that text in the selected field.');
    }
    
    // Re-render the entire grid to show highlights and new values
    renderEpisodes(allEpisodes);
}
