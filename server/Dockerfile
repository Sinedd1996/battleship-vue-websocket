ARG NODE_VERSION=20.15.0

# stage 1
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package*.json yarn.lock index.js ./
RUN yarn install

# stage 2
FROM node:${NODE_VERSION}-alpine
# Копируем собранные файлы из предыдущего этапа
COPY --from=build /app /
EXPOSE 4000
CMD ["node", "index.js"]
