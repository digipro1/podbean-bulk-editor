// script.js

// --- Configuration ---
// IMPORTANT: Do NOT hardcode your Client ID here in a real public app.
// We will use Netlify's environment variables for this.
// For local testing, you can temporarily hardcode it.
const PODBEAN_CLIENT_ID = '1f0af1b11d24bbb95de32'; // Replace with your actual Client ID
const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html'; // Must match Podbean app settings

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    const editorContainer = document.getElementById('editor-container');
    const loginContainer = document.getElementById('login-container');

    // Check if we already have an access token in storage
    const accessToken = localStorage.getItem('podbean_access_token');

    if (accessToken) {
        // If we have a token, show the editor and hide the login button
        console.log('Successfully logged in. Access Token is available.');
        loginContainer.style.display = 'none';
        editorContainer.style.display = 'block';
        
        // --- NEXT STEP ---
        // We will add the function to fetch your episodes right here.
        
    } else {
        // If there's no token, ensure the login view is shown
        loginContainer.style.display = 'block';
        editorContainer.style.display = 'none';
    }

    // Add click listener for the login button
    loginButton.addEventListener('click', () => {
        // Construct the Podbean authorization URL with the corrected scope format
        const authUrl = `https://api.podbean.com/v1/dialog/oauth?` +
            `client_id=${PODBEAN_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=episode_read episode_write`; // CORRECT: Scopes are separated by a space

        // Redirect the user to Podbean
        window.location.href = authUrl;
    });
});
