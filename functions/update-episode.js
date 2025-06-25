// functions/update-episode.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // We only accept POST requests for this function
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { episodeId, updates, accessToken } = JSON.parse(event.body);

        if (!episodeId || !updates || !accessToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters: episodeId, updates, or accessToken.' })
            };
        }

        // The Podbean API endpoint for updating a specific episode
        const podbeanApiUrl = `https://api.podbean.com/v1/episodes/${episodeId}`;

        const params = new URLSearchParams();
        params.append('access_token', accessToken);

        // Add all the fields from our 'updates' object to the request body
        for (const key in updates) {
            params.append(key, updates[key]);
        }
        
        const response = await fetch(podbeanApiUrl, {
            method: 'POST',
            body: params
        });

        const data = await response.json();

        if (!response.ok) {
            // Forward the error from Podbean
            console.error('Error from Podbean API:', data);
            return { statusCode: response.status, body: JSON.stringify(data) };
        }

        // Forward the successful response from Podbean
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        console.error('Critical error in update-episode function:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to process the update request.', details: error.message })
        };
    }
};
