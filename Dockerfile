FROM node:12.22.1-alpine3.10 as setuprunner
WORKDIR /app
RUN apk update && \
    apk add git openssh docker docker-compose



FROM node:12.22.1-alpine3.10 as preinstaller
WORKDIR /app
RUN apk update && \
    apk add git openssh



FROM node:12.22.1-alpine3.10 as main
WORKDIR /app
