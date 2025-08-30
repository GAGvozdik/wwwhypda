# Deployment Requirements & Guide

This document outlines the necessary components and steps to deploy the web application on a production server with a custom domain and a secure HTTPS connection.

---

## Part 1: Required Components

To launch the project, we require the following resources and information.

### 1.1. From the Client:
*   **A Domain Name:** The primary address for the website (e.g., `your-project.com`). Please also specify any subdomains if needed (e.g., `www.your-project.com`, `api.your-project.com`).
*   **A Server (VPS):** A Virtual Private Server where the application will be hosted.

### 1.2. Server Requirements (for the System Administrator):
*   **A public, static IP address.**
*   **SSH access** to the server.
*   **Docker and Docker-Compose** must be installed on the server.

### 1.3. DNS Configuration (for the System Administrator or Domain Manager):
*   **DNS "A" Records:** For each domain and subdomain, an "A" record must be created in your domain registrar's control panel, pointing to the server's public IP address.
    *   `your-project.com`      -> `(Server's Public IP)`
    *   `www.your-project.com`  -> `(Server's Public IP)`
    *   `api.your-project.com`  -> `(Server's Public IP)` *(if applicable)*

---

## Part 2: Action Plan for the System Administrator

This is a technical guide for setting up the application on the prepared server.

### Step 1: Initial Server Setup

1.  Clone the project repository to the server.
2.  In the root of the project directory, create the data directories for the SSL certificates. This is crucial for persisting certificates between container restarts.
    ```bash
    mkdir -p data/certbot/www
    mkdir -p data/certbot/conf
    ```

### Step 2: Update Configuration Files

1.  **`nginx_subdomain.conf`**: Replace all placeholder domains (e.g., `site.ru`, `api.site-test-deploy1.ru`) with the actual domain names provided by the client.

2.  **`docker-compose.yml`**: This file needs to be adjusted for production. A `certbot` service should be added, and the `nginx` service must be modified to handle SSL and certificate data.

    Here is an example of the required services:
    ```yaml
    version: '3.7'

    services:
      # ... your backend and frontend services ...

      nginx:
        image: nginx:stable-alpine
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - './nginx_subdomain.conf:/etc/nginx/nginx.conf'
          - './data/certbot/www:/var/www/certbot'
          - './data/certbot/conf:/etc/letsencrypt'
        depends_on:
          - backend
          - frontend
        networks:
          - dev

      certbot:
        image: certbot/certbot
        volumes:
          - './data/certbot/www:/var/www/certbot'
          - './data/certbot/conf:/etc/letsencrypt'
    ```

### Step 3: Obtain the SSL Certificate

You cannot start Nginx with the SSL configuration before the certificate files exist. We will use Certbot to get the certificates first.

1.  Make sure the DNS "A" records have been created and have propagated.
2.  Run the Certbot container to request the certificate. This command uses the `standalone` method, which spins up a temporary webserver on port 80 to verify domain ownership.
    
    *(Note: Ensure no other service is using port 80 on the host when running this command).*

    ```bash
    docker-compose run --rm --service-ports certbot certonly --standalone \
      --email your-admin-email@example.com \
      --agree-tos --no-eff-email \
      -d your-project.com -d www.your-project.com
    ```
    *   **Important:** Replace `your-admin-email@example.com` and the domain (`-d`) flags with the correct values.
    *   It is highly recommended to add the `--staging` flag for initial tests to avoid Let's Encrypt rate limits. If the staging test is successful, run the command again without it to get the real certificate.

### Step 4: Final Deployment

Once Certbot has successfully created the certificates in the `./data/certbot/conf` directory, you can launch the entire application stack.

```bash
docker-compose up --build -d
```
Nginx will now start correctly, as it can find the SSL certificate files in the mounted volume.

### Step 5: Set Up Automatic Renewal

Let's Encrypt certificates are valid for 90 days. They must be renewed periodically.

You can set up a cron job on the host server to run the renewal command weekly.

1.  Open the crontab editor: `crontab -e`
2.  Add the following line, which will run the command every Sunday at 2:30 AM.
    ```
    30 2 * * 0 cd /path/to/your/project && docker-compose run --rm certbot renew && docker-compose restart nginx
    ```
    *   Ensure you replace `/path/to/your/project` with the actual path to the project directory. The command attempts to renew the certificate and then gracefully restarts Nginx to apply it.

