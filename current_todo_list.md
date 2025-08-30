окей вот тут я убрал из .env baseurl и это было ошибкой, лучше вынести эту зависимость в ощий файл конфигов

DNS and SSL/TLS sertificates and smth with let's encrypt
domain info
Test in docker
Fix instructions
create docker image
del users db from github
del api keys from git history
protect add row and del row using recaptcha
add function deny dataset in superuser account

1. add a way to add user suggestions in wwwhypda database in right way (not like a current way)

2. add captcha to input table steps ??

3. add an opportunity to verify email for users, who registered and non verifyed ??

4. add bun field ??

5. ~~fix double load on resend code~~

6. ~~divide databases~~

7. ~~after superuser submit data navigate to account instead superaccount~~

8. ~~add status "in process of checking by admins" and "in process of checking by admins NOW" with modal window with warning message, to prevent editing at the same time~~

9. ~~make unactive clear data buton & add/remove row buttons in reading mode + del submit step~~

10. ~~Why account page exists, after superusers log in? and redirect to account page from edit after submit data ~~ 

11. ~~change unactive buttons style in reading mode~~

12. ~~add google recaptcha~~

13. ~~add tests cypress for registration, login and password reset~~