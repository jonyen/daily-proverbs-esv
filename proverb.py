#!/usr/bin python

import requests
import datetime
import slack
import os

API_URL = 'https://api.esv.org/v3/passage/text/'
ESV_API_KEY = os.environ['ESV_API_KEY']

d = datetime.datetime.today()

params = { 
  'q': 'Proverbs %s' % d.day
}

headers = {
  'Authorization': 'Token %s' % ESV_API_KEY 
}

data = requests.get(API_URL, params=params, headers=headers).json()

text = data['passages'][0]

client = slack.WebClient(token='xoxp-622141732785-627953923508-764652323395-65229b04d0fa6089a716b42938c5ea50')

response = client.chat_postMessage(
  channel='#dailyproverbs',
  text=text) 
