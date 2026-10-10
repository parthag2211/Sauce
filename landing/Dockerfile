FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs demo-router.mjs start.sh ./
COPY backend ./backend
COPY public ./public
COPY public/demo ./public/demo
ENV NODE_ENV=production
CMD ["sh", "start.sh"]
