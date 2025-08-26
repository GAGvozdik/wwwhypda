# Installation instructions

1. Install NodeJS ([https://nodejs.org/en/download](https://nodejs.org/en/download))
   and Python (this version was tested with Python 3.12.6).
2. Create the configuration file.
   Create a new file named `env.configs` in folder with `mainApp.py` and write into:

   > MAIN_DATABASE_FILENAME = 'wwhypda.db'
   > 
   > USERS_DATABASE_FILENAME = 'users_data.db'
   > 
   > MAIL_SERVER = 'smtp.gmail.com'
   >
   > MAIL_PORT = '465'
   > 
   > MAIL_USERNAME = 'your_gmail_email@gmail.com'
   > 
   > MAIL_PASSWORD = 'your gmail api key'
   > 
   > SECRET_KEY = 'your_random_secret_key'
   > 
   > JWT_SECRET_KEY = 'your_random_secret_key'
   > 
   > JWT_ACCESS_COOKIE_NAME = 'jwt'
   > 
   > RECAPTCHA_SECRET_KEY = 'your_google_recaptcha_secret_key'
   > 
   > SWAGGER_URL = '/swagger' 
   > 
   > API_URL = '/static/swagger.json' 
   > 
   > STATIC_IP = 'http://192.168.154.231'
   > 
   > ACCESS_EXPIRES_SECONDS=21600
   > 
   > REFRESH_EXPIRES_SECONDS=86400
   > 
   > TESTING=False
   > 
   > DEBUG = True

3. Set up the mail server. To get mail code to set up a mail server using gmail:

   - Turn on 2 step verification in your google account

     ![Turn on 2 step verification in your google account](/instructions/instruction3.png)

   - Go to *App passwords*

     ![Go to App passwords](/instructions/instruction1.png)

   - Register your gmail app and copy code

     ![Register your gmail app and copy code](/instructions/instruction2.png)

     or try to follow the instructions that you can find at
     [https://mailtrap.io/blog/flask-send-email-gmail/](https://mailtrap.io/blog/flask-send-email-gmail/)
     and create your own mail code.

   - Add your mail code in `env.configs` in ``MAIL_PASSWORD = 'your mail special code'``

   :warning: **Warning:** DON'T SHOW YOUR SECRET KEYS TO ANYONE AND DON'T SEND IT TO GITHUB !!!

3. Create your google recaptcha key using instruction (https://developers.google.com/recaptcha). Then set your api key in env.configs

4. Run the back-end. In your terminal, inside the cloned `wwhypda`
   folder, first move to the folder `wwhypda-backend`:

       cd wwhypda-backend
       
   Then, create a virtual environment and activate it. You can for
   example use the following line to create and activate the Python
   virtual environment `workEnv`:
   
       python -m venv workEnv workEnv/Scripts/Activate

   In the activated virtual environment, install with ``pip`` the requirements:
   
       pip install -r requirements.txt

   Finally, you can run the backend application by using:
   
       python mainApp.py

   It may happen that some other module (for example `dotenv`) is
   missing. Install it with `pip`.  Also, if you do not want to keep
   the running terminal busy, you can type `<CRTL>+<z>` and the `bg`.
   
   
5. Run the front-end.
   Type in terminal in folder `wwwhydpa`:

       cd wwhypda-frontend
       npm i
       npm start

You can then follow the provided local URL to work with wwhypda!

:memo: **Note:** Once the main application is running, you can use
Swagger to check the documentation using the link:
[http://127.0.0.1:5000/swagger/](http://127.0.0.1:5000/swagger/)
