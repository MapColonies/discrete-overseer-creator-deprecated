FROM node:12 as build


WORKDIR /tmp/buildApp

COPY ./package*.json ./

RUN npm install
COPY . .
RUN npm run build

FROM node:12.22.2-slim as production

ENV NODE_ENV=production
RUN chgrp -R 0 /usr && \
    chmod -R g=u /usr
RUN useradd -ms /bin/bash user && usermod -a -G root user
ENV SERVER_PORT=8080

WORKDIR /usr/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /tmp/buildApp/dist .
COPY --from=build /tmp/buildApp/node_modules ./node_modules
COPY ./config ./config

USER user
EXPOSE 8080
CMD ["node", "--max_old_space_size=512", "./index.js"]
