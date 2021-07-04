FROM node:16.3.0-alpine

RUN mkdir -p /home/node/app \
  && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json yarn.lock ./

USER node

RUN yarn install --pure-lockfile

COPY --chown=node:node . .

EXPOSE 3000

ENV NODE_ENV production

CMD ["yarn", "start"]