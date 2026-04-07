# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native bindings on Alpine
RUN apk add --no-cache libc6-compat

# Copy package.json
COPY package*.json ./

# Install dependencies. Using npm install instead of npm ci since we deleted package-lock.json
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 3000
EXPOSE 3000

# Nginx will be started automatically by the base image
