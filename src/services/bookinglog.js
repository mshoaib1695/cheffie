import { BookingLog, Booking } from "../models"
import moment from 'moment'
const { Op } = require("sequelize");

const registerBookingLog = async (bookingId, action) => {
    return new Promise(async (accept, reject) => {
        try {
            const log = await BookingLog.findOrCreate({
                where: {
                    bookingId: bookingId,
                    action: action,
                },
                defaults: {
                    bookingId: bookingId,
                    action: action,
                }
            });
            accept(log);
        } catch (e) {
            reject({ e });
        }
    });
}
const registerBookingCompleted = async () => {
    try {
        const bookings = await Booking.findAll({
            where: {
                status: 'confirmed',
                event_date: {
                    [Op.gt]: moment().subtract(3, 'days').toDate(),
                    [Op.lt]: moment().toDate(),
                }
            }
        })
        for (let i = 0; i < bookings.length; i++) {
            registerBookingLog(bookings[i].dataValues.id, 'Completed')
        }
    }
    catch (e) {
        console.log(e)
    }
}
export {
    registerBookingLog,
    registerBookingCompleted
}