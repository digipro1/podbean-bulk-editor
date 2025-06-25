// functions/update-episode.js - with added logging for debugging

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'You must be logged in.' }) };
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
        const params = new URLSearchParams();
        params.append('access_token', accessToken);

        for (const key in updates) {
            if (updates[key] !== null && updates[key] !== undefined) {
                params.append(key, updates[key]);
            }
        }
        
        // --- NEW LOGGING ---
        // Log the exact parameters being sent to Podbean's server.
        console.log('--- Sending Update to Podbean ---');
        console.log('Episode ID:', episodeId);
        console.log('Payload Sent:', params.toString());
        // --- END LOGGING ---

        const response = await fetch(podbeanApiUrl, { 
            method: 'POST', 
            body: params 
        });

        const data = await response.json();

        if (!response.ok) {
            // Log the error response from Podbean
            console.error('--- Error Response from Podbean ---', data);
            return { statusCode: response.status, body: JSON.stringify(data) };
        }
        
        console.log('--- Success Response from Podbean ---', data);
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        console.error('--- Critical Function Error ---', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to process update request.', details: error.message })
        };
    }
};
