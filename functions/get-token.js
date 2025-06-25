// functions/get-token.js (Secured)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'You must be logged in to perform this action.' }) };
    }

    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Client ID or Secret is missing.' })};
    }

    const tokenUrl = 'https://api.podbean.com/v1/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

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
            return { statusCode: response.status, body: JSON.stringify(data) }; 
        }

        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'A critical internal error occurred.', details: error.message })};
    }
};
