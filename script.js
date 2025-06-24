// script.js - Client Credentials Flow

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
        
        // 2. Store the token in a global variable (or in memory)
        // We don't need localStorage anymore since we get a new token on each page load.
        window.podbeanAccessToken = accessToken;

        statusMessage.textContent = 'Authentication successful. Fetching episodes...';
        
        // 3. Call the function to fetch and display the episodes
        // We will build this function in our very next step.
        // await fetchEpisodes(accessToken);

        // For now, let's just show a success message
        editorContainer.style.display = 'block';
        document.getElementById('episode-list').textContent = 'Episode editor will go here!';
        statusMessage.style.display = 'none'; // Hide the status message

    } catch (error) {
        statusMessage.style.color = 'red';
        statusMessage.textContent = `Error: ${error.message}`;
        console.error('Initialization failed:', error);
    }
}
