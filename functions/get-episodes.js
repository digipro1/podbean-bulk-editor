// functions/get-episodes.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Get parameters from the request URL
    const { access_token, offset, limit } = event.queryStringParameters;

    if (!access_token) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Access token is required.' })
        };
    }

    const podbeanApiUrl = `https://api.podbean.com/v1/episodes?access_token=${access_token}&offset=${offset || 0}&limit=${limit || 100}`;

    try {
        const response = await fetch(podbeanApiUrl);
        const data = await response.json();

        if (!response.ok) {
            // Forward the error from Podbean
            return { statusCode: response.status, body: JSON.stringify(data) };
        }

        // Forward the successful response from Podbean
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to fetch episodes from Podbean.', details: error.message })
        };
    }
};
