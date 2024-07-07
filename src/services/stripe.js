
import dotenv from "dotenv";
dotenv.config();

const Secret_Key = process.env.PAYMENT_GW_SECRET_KEY;
const stripe = require('stripe')(Secret_Key)


export {
    stripe
}