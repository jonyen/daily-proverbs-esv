# daily-proverbs-esv

A simple script that will send out the Proverbs for the day. 

In order to use, you will need to register an API key with esv.org, as well as set up a Gmail account with an app key. 
Create a separate file called `authentication.py` and add `login='your_login'`, `app_password='app_password'`, and `API_KEY='YOUR_API_KEY'`.

Update the `'me'` and `'you'` variables accordingly, and then run the script with `python proverb.py` and that's it. Set up a cronjob or whatever else you need to get it to run daily.

For a dedicated server to run the cronjob for the script, I use a free tier AWS EC2 instance that simply runs the job every morning at 2am. Just log on to the machine and run `crontab -e` and set it to `0 2 * * * python proverb.py` to run it at 2am every day. 

TODO:
* Add option for weekday only delivery (and maybe do an extra chapter for Friday or Monday)
* Stylize the HTML message delivery with CSS
* Create a text-only option
* Set up a new account that's not jonyen@gmail.com
