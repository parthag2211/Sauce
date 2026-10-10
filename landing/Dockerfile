FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs demo-router.mjs ./
COPY public ./public
COPY public/demo ./public/demo
ENV NODE_ENV=production
USER node
CMD ["node", "server.mjs"]
