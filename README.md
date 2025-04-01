1) Install NodeJS
2) Create file env.configs and write into:

   SECRET_KEY='long_random_code'
   DATABASE_URL='sqlite:///wwhypda.db'
   DEBUG=True

   SECRET_MAIL = 'your gmail'

   SWAGGER_URL = '/swagger'
   API_URL = '/static/swagger.json'

   MAIL_PASSWORD = 'your mail special code'

   To get special mail code:

   Turn on 2 step verification in your google account

   ![Turn on 2 step verification in your google account](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction3.png)

   Go to App passwords

   ![Go to App passwords](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction1.png)

   Register your gmail app and copy code

   ![Register your gmail app and copy code](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction2.png)

   or try to follow instruction (https://mailtrap.io/blog/flask-send-email-gmail/) and create your own mail code

   Add your mail code in env.configs in ``MAIL_PASSWORD = 'your mail special code'``

   DON'T SHOW YOUR SECRET KEYS TO ANYONE AND DON'T SEND IT TO GITHUB !!!
3) cd wwhypda-backendpython -m venv workEnvworkEnv/Scripts/Activatepip install -r requrements.txtpython mainApp.pyP.S. demo documentation is available at http://127.0.0.1:5000/swagger/
4) cd wwhypda-frontend
   npm i
   npm start
