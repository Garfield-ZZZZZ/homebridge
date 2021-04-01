FROM node:12-alpine
RUN npm install -g homebridge@1.1.1
RUN mkdir -p /homebridge/plugins
WORKDIR /homebridge/plugins
COPY . .
RUN npm install
ENTRYPOINT homebridge -D -P /homebridge/plugins -U /homebridge/storage
