import express from 'express';

import authRouter from "./auth"
import bookingRouter from "./bookings"
import chefRouter from "./chefs"
import menuRouter from "./menus"
import handshakeRouter from "./handshake"
import allergies from "./allergies"
import paymentRouter from "./payment"
import chatmessages from "./chatmessages"
import admin from "./admin"

var router = express.Router();

/* GET home route. */
router.get('/', function (req, res, next) {
  res.status(200).json({ msg: "You got here!" })
});

router.use('/auth', authRouter)
router.use('/bookings', bookingRouter)
router.use('/chefs', chefRouter)
router.use('/menus', menuRouter)
router.use('/handshake', handshakeRouter)
router.use('/allergies', allergies)
router.use('/payment', paymentRouter)
router.use('/chats', chatmessages)
router.use('/admin', admin)

export default router;
