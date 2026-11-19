FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV QIANKUN_FRONT_URL=https://harx.ai
ENV IS_PREPROD=false

ENV AWS_REGION=eu-west-3
ENV AWS_SES_FROM_EMAIL=chafik.sabiry@harx.ai

ENV BREVO_FROM_EMAIL=chafik.sabiry@harx.ai
ENV SMTP_SENDER_NAME=harx

ENV PORT=5011


EXPOSE 5011

CMD ["npm", "start"]
