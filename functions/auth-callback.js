// functions/auth-callback.js

// We use 'node-fetch' for making HTTP requests in a Node.js environment.
// You'll need to install it by running: npm install node-fetch
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Get the temporary code from the query string
    const { code } = event.queryStringParameters;

    // Retrieve your Client ID and Secret from environment variables
    // These are set in the Netlify UI for security
    const CLIENT_ID = process.env.PODBEAN_CLIENT_ID;
    const CLIENT_SECRET = process.env.PODBEAN_CLIENT_SECRET;
    const REDIRECT_URI = process.env.VITE_REDIRECT_URI || 'http://localhost:8888/callback.html'; // Use live URI in production

    // Prepare the request to Podbean's token endpoint
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

        // If there's an error, return it
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error_description || 'Failed to get token.' })
            };
        }

        // Success! Return the access token to the front-end.
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' })
        };
    }
};
