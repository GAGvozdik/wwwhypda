FROM python:3.11.9-slim

COPY wwwhypda-backend/requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY common /common
COPY wwwhypda-backend/ .

CMD [ "python", "mainApp.py" ]