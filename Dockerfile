FROM node:12-slim
WORKDIR /backend
# COPY package.json /frontend
# RUN npm install
COPY . /backend
EXPOSE 8090
# CMD npm run build && npm run server
CMD npm run server
