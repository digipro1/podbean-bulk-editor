// script.js - Full version with syntax error fixed for testing

// --- Configuration ---
// Using the specific credentials you provided.
const PODBEAN_CLIENT_ID = '1f0af1b11d24bbb95de32'; 
const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html';

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
        // Construct the Podbean authorization URL.
        // This version has the duplicate line removed to fix the syntax error.
        // We are still testing with ONLY the 'episode_read' scope.
        const authUrl = `https://api.podbean.com/v1/dialog/oauth?client_id=${PODBEAN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=episode_read`;

        // Redirect the user to Podbean
        window.location.href = authUrl;
    });
});
