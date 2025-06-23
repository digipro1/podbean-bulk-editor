// functions/auth-callback.js - Final Correct Version

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { code } = event.queryStringParameters;

    if (!code) {
        return { statusCode: 400, body: JSON.stringify({ error: "No authorization code from client." }) };
    }

    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;
    const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html';

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' }) };
    }
    
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

        const data = await response.json(); 

        if (!response.ok) {
            console.error("Podbean API returned an error status.", data);
            return { statusCode: response.status, body: JSON.stringify(data) };
        }

        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'A critical internal error occurred.', details: error.message })};
    }
};
