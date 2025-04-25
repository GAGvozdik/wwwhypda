# Installation instructions

1. Install NodeJS ([https://nodejs.org/en/download](https://nodejs.org/en/download))
   and Python (this version was tested with Python 3.12.6).
2. Create file `env.configs` in folder with `mainApp.py` and write into:

   MAIL_SERVER = smtp.gmail.com

   MAIL_PORT = 465

   SECRET_KEY='your_long_random_code_%*&8hHJ+=_Klhtfo*89buibgyuoGUIonguionphiohio'
   DATABASE_URL='sqlite:///wwhypda.db'
   DEBUG=True

   MAIL_USERNAME = 'yourmail@gmail.com'

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
4) Type in terminal in folder wwwhydpa/ :
   cd wwhypda-frontend
   npm i
   npm start
