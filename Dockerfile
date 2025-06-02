FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV MONGODB_URI=mongodb://harx:ix5S3vU6BjKn4MHp@207.180.226.2:27017/V25_HarxPreProd
ENV QIANKUN_FRONT_URL=https://v25-preprod.harx.ai
ENV PORT=5011


EXPOSE 5011

CMD ["npm", "start"]
