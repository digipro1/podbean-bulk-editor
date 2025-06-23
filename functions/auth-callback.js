<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Authorizing...</title>
    <style>
        body { font-family: sans-serif; padding: 2em; line-height: 1.5; }
        code { background-color: #eee; padding: 0.2em 0.4em; border-radius: 3px; }
    </style>
</head>
<body>
    <p>Please wait, authorizing...</p>

    <script>
        // This script runs as soon as the page loads
        window.onload = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const podbeanError = params.get('error');
            const podbeanErrorDescription = params.get('error_description');

            // First, check if Podbean sent back an error directly in the URL
            if (podbeanError) {
                document.body.innerHTML = `<h2>Error from Podbean</h2><p><b>Error:</b> ${podbeanError}</p><p><b>Description:</b> ${podbeanErrorDescription || 'No description provided.'}</p>`;
                return; // Stop execution
            }

            if (code) {
                // If there's a code, try to get the token
                try {
                    const response = await fetch(`/api/auth-callback?code=${code}`);
                    const data = await response.json();

                    if (data.access_token) {
                        // Success!
                        localStorage.setItem('podbean_access_token', data.access_token);
                        localStorage.setItem('podbean_token_expires_in', data.expires_in);
                        window.location.href = '/'; // Redirect to main page
                    } else {
                        // --- ENHANCED ERROR DISPLAY ---
                        // This now handles the more detailed errors from our function
                        let errorMessage = `<h2>Error from Application Server</h2>`;
                        errorMessage += `<p><b>Error:</b> ${data.error || 'Could not retrieve access token.'}</p>`;
                        if (data.details) {
                           errorMessage += `<p><b>Details:</b> ${data.details}</p>`;
                        }
                         if (data.error_description) {
                           errorMessage += `<p><b>Podbean Details:</b> ${data.error_description}</p>`;
                        }
                        document.body.innerHTML = errorMessage;
                    }
                } catch (e) {
                    document.body.innerHTML = `<h2>Fetch Error</h2><p>Could not contact the application server.</p><p><b>Details:</b> ${e.message}</p>`;
                }
            } else {
                // This is the original error if no code and no error is found
                document.body.innerHTML = `<h2>Authorization Error</h2><p>No authorization code was found in the URL. Please try logging in again.</p>`;
            }
        };
    </script>
</body>
</html>
