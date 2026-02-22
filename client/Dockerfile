# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# TODO: 填寫您申請到的 Google GAM 版位 ID (不要加引號)
ENV VITE_GAM_REWARD_AD_UNIT=/22639388115/rewarded_web_example

RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
