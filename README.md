# daily-proverbs-esv

A simple script that will send out the Proverbs for the day. 

In order to use, you will need to register an API key with esv.org, as well as set up a Gmail account with an app key. 
Create a separate file called `authentication.py` and add `login='your_login'`, `app_password='app_password'`, and `API_KEY='YOUR_API_KEY'`.

Update the 'me' and 'you' variables accordingly, and then run the script with `python proverb.py` and that's it. Set up a cronjob or whatever else you need to get it to run daily.
