1)  ###Install NodeJS

2)  ###Create folder SECRET_KEYS with files: JWT_KEY.txt, MAIL_PASSWORD.txt, MAIL.txt, SECRET_KEY.txt.
    ###Add long random codes in JWT_KEY.txt, SECRET_KEY.txt.
    ###Add your gmail in MAIL.txt
    ###Turn on 2 step verification in your google account    

    ![Turn on 2 step verification in your google account](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction3.png)

    ###Go to App passwords

    ![Go to App passwords](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction1.png)

    ###Register your gmail app and copy code

    ![Register your gmail app and copy code](https://github.com/GAGvozdik/wwwhypda/blob/main/instructions/insruction2.png)

    ###or try to follow instruction (https://mailtrap.io/blog/flask-send-email-gmail/) and create your own mail code

    ###Add your mail code in MAIL_PASSWORD.txt

    ###DON'T SHOW YOUR SECRET KEYS TO ANYONE AND DON'T SEND IT TO GITHUB !!!

3)  ###cd wwhypda-backend
    ###python -m venv workEnv
    ###workEnv/Scripts/Activate
    ###pip install -r requrements.txt
    ###python mainApp.py
    ###P.S. demo documentation is available at http://127.0.0.1:5000/swagger/

4)  ###cd wwhypda-frontend
    ###npm i
    ###npm start

