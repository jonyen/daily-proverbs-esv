#!/usr/bin/env python3

import requests
import datetime
import sys
import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

API_URL = 'https://api.esv.org/v3/passage/text/'
ESV_API_KEY = os.environ.get('ESV_API_KEY')
SLACK_TOKEN = os.environ.get('SLACK_TOKEN')

# Validate required environment variables
if not ESV_API_KEY:
    sys.exit('ERROR: ESV_API_KEY environment variable not set')
if not SLACK_TOKEN:
    sys.exit('ERROR: SLACK_TOKEN environment variable not set')

try:
    d = datetime.datetime.today()

    params = {
        'q': f'Proverbs {d.day}'
    }

    headers = {
        'Authorization': f'Token {ESV_API_KEY}'
    }

    # Make request with timeout and explicit SSL verification
    response = requests.get(
        API_URL,
        params=params,
        headers=headers,
        timeout=30,
        verify=True
    )
    response.raise_for_status()

    data = response.json()

    # Validate response structure
    if 'passages' not in data or not data['passages']:
        sys.exit('ERROR: Invalid response from ESV API - no passages found')

    text = data['passages'][0]

    # Post to Slack
    client = WebClient(token=SLACK_TOKEN)

    slack_response = client.chat_postMessage(
        channel='#dailyproverbs',
        text=text
    )

    print(f'Message posted successfully: {slack_response["ts"]}')

except requests.exceptions.Timeout:
    sys.exit('ERROR: Request to ESV API timed out')
except requests.exceptions.RequestException as e:
    sys.exit(f'ERROR: Request to ESV API failed: {e}')
except SlackApiError as e:
    sys.exit(f'ERROR: Slack API error: {e.response["error"]}')
except (KeyError, IndexError) as e:
    sys.exit(f'ERROR: Unexpected API response structure: {e}')
except Exception as e:
    sys.exit(f'ERROR: Unexpected error: {e}') 
