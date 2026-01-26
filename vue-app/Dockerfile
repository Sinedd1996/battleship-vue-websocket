ARG NODE_VERSION=20.15.0
# stage 1
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./
# Устанавливаем зависимости
RUN yarn install
# Копируем все остальные файлы приложения
COPY . .
# Собираем приложение
RUN yarn run build

# stage 2
FROM nginx:alpine
# Копируем собранные файлы из предыдущего этапа
COPY --from=build /app/dist /usr/share/nginx/html
# Открываем порт 80
EXPOSE 80
# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]