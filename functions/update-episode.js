// functions/update-episode.js - Corrected to use application/x-www-form-urlencoded

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'You must be logged in to perform this action.' }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { episodeId, updates, accessToken } = JSON.parse(event.body);

        if (!episodeId || !updates || !accessToken) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
        }

        const podbeanApiUrl = `https://api.podbean.com/v1/episodes/${episodeId}`;

        // --- CRITICAL FIX: Create a URLSearchParams object ---
        // This will format the body as application/x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('access_token', accessToken);

        // Add all the fields from our 'updates' object to the request body
        for (const key in updates) {
            // Ensure we don't send null/undefined values
            if (updates[key] !== null && updates[key] !== undefined) {
                params.append(key, updates[key]);
            }
        }
        
        const response = await fetch(podbeanApiUrl, { 
            method: 'POST', 
            body: params // The body is now correctly formatted
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error from Podbean API:', data);
            return { statusCode: response.status, body: JSON.stringify(data) };
        }
        
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        console.error('Critical error in update-episode function:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to process the update request.', details: error.message })
        };
    }
};
