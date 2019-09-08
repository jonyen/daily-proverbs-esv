import cgi
form = cgi.FieldStorage()
searchterm =  form.getvalue('email')
