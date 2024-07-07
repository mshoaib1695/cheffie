import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';
import { requestLog } from './middlewares/request_log';
import db from './models';
import socketio from "socket.io";
import WebSockets from "./utils/WebSocket"
import http from "http";
import schedule from "node-schedule";
import { payoutschedular } from "./utils/schedular";
import { registerBookingCompleted } from './services/bookinglog'
import { transferToChef , transferToChefAfterBooking} from './services/paymentSchedular'
import { getAllConfirmedBookings , getAllOutStandingBookings} from './services/bookingReminder';

db.sequelize.sync();

import indexRouter from './routes/index';
import dotenv from "dotenv";
dotenv.config();

const { PORT } = process.env;

const port = PORT || '8090';
const app = express();
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || "https://dev.cheffie.co.uk"

global.io = socketio(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://cheffie.co.uk',
  'https://cheffie.co.uk',
  'http://www.cheffie.co.uk',
  'https://www.cheffie.co.uk',
  'http://admin.cheffie.co.uk',
  'http://www.admin.cheffie.co.uk',
  'https://admin.cheffie.co.uk',
  'https://www.admin.cheffie.co.uk',
  'https://dev.cheffie.co.uk',
  'https://www.dev.cheffie.co.uk',
  'http://dev.cheffie.co.uk',
  'http://www.dev.cheffie.co.uk',
  'http://localhost:3100',
  'http://cheffie.nxtlabs.com',
  'https://cheffie.nxtlabs.com',
  'https://www.cheffie.nxtlabs.com',
  'http://www.cheffie.nxtlabs.com',
];
const corsOptionsDelegate = (req, callback) => {
  let corsOptions;

  let isDomainAllowed = allowedOrigins.indexOf(req.header('Origin')) !== -1;

  if (isDomainAllowed) {
    // Enable CORS for this request
    corsOptions = { origin: true };
  } else {
    // Disable CORS for this request
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};
app.options('*', cors());
app.use(cors(corsOptionsDelegate));

if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
}

app.use(logger('dev'));

app.use(requestLog);

app.use('/', indexRouter);
global.io.on('connection', WebSockets.connection)

schedule.scheduleJob('*/3 * * *', function () {
  try{
    transferToChef()
  }
  catch(e){
    console.log(e)
  }
});
schedule.scheduleJob('*/4 * * *', function () {
  try{
    transferToChefAfterBooking()
  }
  catch(e){
    console.log(e)
  }
});
schedule.scheduleJob('59 59 23 * * *', function () {
  registerBookingCompleted()
  getAllOutStandingBookings();
});
schedule.scheduleJob('0 0 */6 * * *', function () {
  try{
    getAllConfirmedBookings()
  }
  catch(e){
    console.log(e)
  }
});

server.listen(port, function () {
  console.log(`App is listening on port ${port}`);
});
