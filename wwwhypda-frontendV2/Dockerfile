FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN CYPRESS_INSTALL_BINARY=0 npm ci

COPY . .
# Compose builds with the selected environment at container startup.
