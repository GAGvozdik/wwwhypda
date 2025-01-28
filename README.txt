1)  Install NodeJS

2)  Create folder SECRET_KEYS with files: JWT_KEY.txt, MAIL_PASSWORD.txt, MAIL.txt, SECRET_KEY.txt.
    Add long random codes in JWT_KEY.txt, SECRET_KEY.txt.
    Add your gmail in MAIL.txt
    Follow instruction (https://mailtrap.io/blog/flask-send-email-gmail/) and create your own mail code
    Add your mail code in MAIL_PASSWORD.txt

    DON`T SHOW YOUR SECRET KEYS TO ANYONE AND DON`T SEND IT TO GITHUB !!!

3)  cd wwhypda-backend
    python -m venv workEnv
    workEnv/Scripts/Activate
    pip install -r requrements.txt
    python mainApp.py
    P.S. demo documentation is available at http://127.0.0.1:5000/swagger/

4)  cd wwhypda-frontend
    npm i
    npm start

