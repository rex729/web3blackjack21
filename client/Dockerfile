# 第一階段：編譯階段 (Build Stage)
# 使用輕量級的 Node.js 18 鏡像作為基礎
FROM node:18-alpine as build-stage

# 設定容器內的工作目錄
WORKDIR /app

# 先複製 package.json 和 lock 檔案，利用 Docker 層快取機制加速後續構建
COPY package*.json ./

# 安裝專案依賴
RUN npm install

# 複製其餘的所有原始碼
COPY . .

# 執行生產環境編譯，產生 dist 靜態資料夾
RUN npm run build

# 第二階段：運行階段 (Production Stage)
# 使用高效能的 Nginx 鏡像來服務靜態檔案
FROM nginx:stable-alpine as production-stage

# 從第一階段 (build-stage) 複製編譯完成的 dist 資料夾到 Nginx 的預設靜態網頁路徑
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 複製自定義的 Nginx 設定配置（處理 SPA 路由問題）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 宣告容器對外監聽的連接埠為 80
EXPOSE 80

# 啟動 Nginx 伺服器，並保持在前台運行
CMD ["nginx", "-g", "daemon off;"]
