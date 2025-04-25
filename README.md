# Installation instructions

1. Install NodeJS ([https://nodejs.org/en/download](https://nodejs.org/en/download))
   and Python (this version was tested with Python 3.12.6).
2. Create the configuration file.
   Create a new file named `env.configs` in folder with `mainApp.py` and write into:

   > MAIL_SERVER = smtp.gmail.com
   >
   > MAIL_PORT = 465
   >
   > SECRET_KEY='your_long_random_code_%*&8hHJ+=_Klhtfo*89buibgyuoGUIonguionphiohio'
   > DATABASE_URL='sqlite:///wwhypda.db'
   > DEBUG=True
   >
   > MAIL_USERNAME = 'yourmail@gmail.com'
   >
   > SWAGGER_URL = '/swagger'
   > API_URL = '/static/swagger.json'
   >
   > MAIL_PASSWORD = 'your mail special code'

3. Set up the mail server. To get mail code to set up a mail server using gmail:

   - Turn on 2 step verification in your google account

     ![Turn on 2 step verification in your google account](/instructions/instruction3.png)

   - Go to *App passwords*

     ![Go to App passwords](/instructions/instruction1.png)

   - Register your gmail app and copy code

     ![Register your gmail app and copy code](/instructions/instruction2.png)

     or try to follow the instructions that you can find at [https://mailtrap.io/blog/flask-send-email-gmail/](https://mailtrap.io/blog/flask-send-email-gmail/) and create your own mail code.

   - Add your mail code in `env.configs` in ``MAIL_PASSWORD = 'your mail special code'``

   :warning: **Warning:** DON'T SHOW YOUR SECRET KEYS TO ANYONE AND DON'T SEND IT TO GITHUB !!!


3. Run the backend.
   In your terminal, inside the cloned `wwhypda` folder, first move to the folder `wwhypda-backend`:

       cd wwhypda-backend
       
   Then, create a virtual environment and activate it. You can for example use the following line to create and activate
   the Python virtual environment `workEnv`:
   
       python -m venv workEnv workEnv/Scripts/Activate

   In the activated virtual environment, install with ``pip`` the requirements:
   
       pip install -r requrements.txt

   Finally, you can run the backend application by using:
   
       python mainApp.py

   It may happen that some other module (for example `dotenv`) is missing. Install it with `pip`.
   
   :memo: **Note:** Once the main application is running, you can use Swagger to check the documentation using the link:
   [http://127.0.0.1:5000/swagger/](http://127.0.0.1:5000/swagger/)
   
4. Run the frontend.
   Type in terminal in folder `wwwhydpa`:

       cd wwhypda-frontend
       npm i
       npm start

You can then follow the provided local url to work with wwhypda!


