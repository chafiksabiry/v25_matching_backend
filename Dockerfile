FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV MONGODB_URI=mongodb://harx:gcZ62rl8hoME@185.137.122.3:27017/V25_CompanySearchWizard
ENV PORT=5011


EXPOSE 5011

CMD ["npm", "start"]
