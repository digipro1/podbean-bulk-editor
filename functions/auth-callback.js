// functions/auth-callback.js - Enhanced Error Reporting

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { code } = event.queryStringParameters;

    // --- Retrieve credentials from Netlify's secure environment variables ---
    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;
    
    // This must EXACTLY match the URI in your Podbean app settings and script.js
    const REDIRECT_URI = 'https://podbean-bulk-editor.netlify.app/callback.html';

    // Check if the environment variables were loaded correctly
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' })
        };
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

        // If Podbean returns an error (like "invalid_client"), show it
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: `Error from Podbean: ${data.error || 'Unknown error.'}`,
                    error_description: data.error_description 
                })
            };
        }

        // Success! Return the access token to the front-end.
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        // --- ENHANCED CATCH BLOCK ---
        // This will now report the actual system error message.
        console.error('An unexpected error occurred:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'An unexpected internal server error occurred.',
                details: error.message 
            })
        };
    }
};
