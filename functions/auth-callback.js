// functions/auth-callback.js - Enhanced Logging Version

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log("--- Auth function started ---");
    const { code } = event.queryStringParameters;

    if (!code) {
        return { statusCode: 400, body: JSON.stringify({ error: "No authorization code from client." }) };
    }

    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;
    const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html';

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error("CRITICAL: Server configuration error: Client ID or Secret is missing from environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' }) };
    }
    
    const tokenUrl = 'https://api.podbean.com/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);

    // --- NEW LOGGING ---
    // Log the parameters we are about to send (NEVER log the secret)
    console.log("Sending request to Podbean with the following parameters:");
    console.log(`- grant_type: authorization_code`);
    console.log(`- client_id: ${CLIENT_ID}`);
    console.log(`- redirect_uri: ${REDIRECT_URI}`);
    console.log(`- code: [present]`);
    console.log(`- client_secret: [present]`);
    // --- END NEW LOGGING ---

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        });

        const responseText = await response.text();
        console.log("Raw response text from Podbean:", responseText.substring(0, 200) + '...'); // Log first 200 chars

        const data = JSON.parse(responseText); 

        if (!response.ok) {
            console.error("Podbean API returned an error status.");
            return { statusCode: response.status, body: JSON.stringify(data) };
        }

        console.log("Success! Token received.");
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        console.error("A critical error occurred while parsing the response:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'A critical internal error occurred.', details: error.message })};
    }
};
