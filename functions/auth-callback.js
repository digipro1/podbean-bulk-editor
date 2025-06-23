// functions/auth-callback.js - Final Debugging Version

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log("Auth function started.");
    const { code } = event.queryStringParameters;

    if (!code) {
        console.log("Error: No authorization code provided in the request.");
        return { statusCode: 400, body: JSON.stringify({ error: "No authorization code from client." }) };
    }

    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;
    const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html';

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error("Server configuration error: Client ID or Secret is missing from environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' }) };
    }
    
    console.log("Attempting to trade code for a token with Podbean.");
    const tokenUrl = 'https://api.podbean.com/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        });

        const responseText = await response.text(); // Get the raw text first
        console.log("Raw response from Podbean:", responseText);
        const data = JSON.parse(responseText); // Now try to parse it

        if (!response.ok) {
            console.error("Podbean API returned an error.", data);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: `Error from Podbean: ${data.error || 'Unknown error.'}`,
                    details: data
                })
            };
        }

        console.log("Successfully received data from Podbean:", data);
        return {
            statusCode: 200,
            body: JSON.stringify(data) // Send the full response to the frontend
        };

    } catch (error) {
        console.error("A critical error occurred in the function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'A critical internal error occurred.',
                details: error.message 
            })
        };
    }
};
