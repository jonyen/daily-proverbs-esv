#!/usr/bin python

import requests
import datetime
import slack
import os

API_URL = 'https://api.esv.org/v3/passage/text/'
ESV_API_KEY = os.environ['ESV_API_KEY']
SLACK_TOKEN = os.environ['SLACK_TOKEN']

d = datetime.datetime.today()

params = { 
  'q': 'Proverbs %s' % d.day
}

headers = {
  'Authorization': 'Token %s' % ESV_API_KEY 
}

data = requests.get(API_URL, params=params, headers=headers).json()

text = data['passages'][0]

client = slack.WebClient(token=SLACK_TOKEN)

response = client.chat_postMessage(
  channel='#dailyproverbs',
  text=text) 
