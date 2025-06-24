// functions/get-token.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' })
        };
    }

    const tokenUrl = 'https://api.podbean.com/v1/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    // We use HTTP Basic Authentication to send the credentials
    const encodedCredentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();

        if (!response.ok) {
            // If Podbean returns an error, forward it
            return { statusCode: response.status, body: JSON.stringify(data) };
        }

        // Success! Return the token data to the frontend.
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'A critical internal error occurred.', details: error.message })
        };
    }
};
