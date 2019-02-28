#!/usr/bin python

import requests
import datetime
import re

import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from authentication import login, app_password, API_KEY

API_URL = 'https://api.esv.org/v3/passage/html/'

d = datetime.datetime.today()

params = { 
  'q': 'Proverbs %s' % d.day }

headers = {
  'Authorization': 'Token %s' % API_KEY 
}

data = requests.get(API_URL, params=params, headers=headers).json()

html = re.sub('\s+', ' ', data['passages'][0]).strip()

me = "Daily Proverb - ESV"
you = "jonyen@gmail.com"

msg = MIMEMultipart('alternative')
msg['Subject'] = "Proverbs %s" % d.day
msg['From'] = me
msg['To'] = you

msg.attach(MIMEText(html.encode("utf-8"), 'html'))

s = smtplib.SMTP_SSL('smtp.gmail.com', 465)
s.login(login, app_password)
s.sendmail(me, you, msg.as_string())
s.quit()
