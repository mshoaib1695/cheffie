import express from 'express';
var router = express.Router();
import { bookingEmail, updateBookingEmail } from '../utils/email'
import { registerBookingLog } from '../services/bookinglog'
import { chefPaymentTransfers } from '../models';
import db, { Customer } from '../models';
const { Op, STRING } = require("sequelize");
const Booking = db.booking;
const View_Quote = db.view_quote;
const Allergy = db.allergy;
const Menu = db.menu;
const Cooker = db.cooker;
const MenuContent = db.menuContent;
const BookingLog = db.bookingLog;
const Chef = db.chef;
const User = db.user;
const PhoneNumber = db.phoneNumber;
const jwt = require('jsonwebtoken');
import dotenv from 'dotenv';
import { chargeCustomerOnAcceptquote } from '../utils/payments'
dotenv.config();
import verifyToken from "../middlewares/verifyToken"
const updateChefRating = async (chef, thumbs_up) => {
    const chefRes = await Chef.findOne({
        where: {
            id: chef
        }
    })
    const count = await Booking.count({
        where: {
            chef_id: chef,
            thumbs_up: {
                [Op.ne]: null
            }
        }
    })
    let rating = chefRes.dataValues.rating
    let reviews = parseFloat(chefRes.dataValues.reviews)

    let totalNoOfRatings = count ? count : 0
    if (thumbs_up) {
        rating = rating + 1
    }
    reviews = (rating * 100) / (totalNoOfRatings)
    let negativeRating = totalNoOfRatings - rating

    const chefUpdateRes = await Chef.update({
        rating: rating,
        reviews: reviews,
    }, {
        where: {
            id: chef
        }
    })
}
const updateChefRatingForAdmin = async (chef, thumbs_up, oldthumbs_up) => {

    const chefRes = await Chef.findOne({
        where: {
            id: chef
        }
    })
    const count = await Booking.count({
        where: {
            chef_id: chef,
            thumbs_up: {
                [Op.ne]: null
            }
        }
    })
    let rating = chefRes.dataValues.rating
    let noOfRAtings = chefRes.dataValues.rating
    let reviews = chefRes.dataValues.reviews

    let totalNoOfRatings = count ? count : 0

    if (oldthumbs_up) {
        if (thumbs_up) {
            rating = rating
        } else {

            rating = rating - 1
            totalNoOfRatings = totalNoOfRatings
        }
    } else {
        if (thumbs_up) {
            rating = rating + 1
            totalNoOfRatings = totalNoOfRatings
        } else {
            rating = rating;
        }
    }

    reviews = totalNoOfRatings ? (rating * 100) / (totalNoOfRatings) : 0
    console.log({
        posRating: rating,
        reviews: reviews,
        totalNoOfRatings: totalNoOfRatings
    })
    const chefUpdateRes = await Chef.update({
        rating: rating,
        reviews: reviews,
    }, {
        where: {
            id: chef
        }
    })
}

/* GET Bookings */
router.get('/', verifyToken, async (req, res, next) => {
    try {
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded && decoded.user_role === 3) {
            const bookings = await Booking.findAll();
            res.status(200).json({ bookings });
        } else {
            throw "Unauthorized"
        }

    } catch (e) {
        res.status(500).json({ e });
    }
});

/* GET Bookings by customer id */
router.get('/byCustomerId/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    try {
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded && (decoded.user_role === 3 || decoded.user_role === 1)) {
            const bookings = await Booking.findAll({
                where: { customer_id: Number(id) },
                order: [['created_at', 'DESC']],
                attributes: ['people_count', 'event_date', 'notes', 'invoice_id', 'status', 'instructions', 'id', 'reference_id', 'thumbs_up'],
                include: [
                    {
                        model: Menu, required: true,
                        attributes: ["id", "name"]
                    },
                    {
                        model: View_Quote,
                        attributes: ["status", 'menu', 'price']
                    },
                    {
                        model: Chef, attributes: ['id', 'image'], required: true,
                        include: [
                            { model: User, attributes: ['full_name'], required: true }
                        ]
                    },
                ],
            });
            res.status(200).json({ bookings });
        } else {
            throw "Unauthorized"
        }

    } catch (e) {
        res.status(500).json({ e });
    }
});
router.get('/byChef/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    try {
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded && decoded.user_role === 2) {
            const bookings = await Booking.findAll({
                where: { chef_id: Number(id) },
                order: [['created_at', 'DESC']],
                attributes: ['people_count', 'event_date', 'notes', 'invoice_id', 'status', 'instructions', 'id', 'reference_id', 'thumbs_up'],
                include: [
                    {
                        model: Menu, required: true,
                        attributes: ["id", "name", "price"]
                    },
                    {
                        model: View_Quote
                    },
                    {
                        model: Customer, attributes: ['id'], required: true,
                        include: [
                            { model: User, attributes: ['full_name'], required: true }
                        ]
                    },
                ],
            });
            res.status(200).json({ bookings });
        } else {
            throw "Unauthorized"
        }

    } catch (e) {
        res.status(500).json({ e });
    }
});

router.get('/rating/:id', async (req, res, next) => {
    try {
        const { params } = req;
        const { id } = params;

        const booking = await Booking.findOne({
            where: { id: Number(id) },
            attributes: ['thumbs_up']
        })
        res.status(200).json({ booking });
    }
    catch (e) {

        res.status(500).json({ e });
    }

})

// url: bookings/rating
router.put('/rating/:id', verifyToken, async (req, res, next) => {
    try {
        const { params, body } = req;
        const { id } = params;
        const { thumbs_up } = body;
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            const booking = await Booking.findOne({
                where: { id: Number(id) },
                attributes: ['thumbs_up', 'chef_id']
            })

            if (booking && decoded.user_role == 1 && booking.dataValues.thumbs_up != null) {
                await Booking.update({
                    thumbs_up
                }, {
                    where: {
                        id: Number(id)
                    }
                });
                updateChefRatingForAdmin(booking.dataValues.chef_id, thumbs_up, booking.dataValues.thumbs_up)
                res.status(200).json({ msg: "Booking has been rated successfully", success: true });
                return
            }
            if (booking && booking.dataValues.thumbs_up === null) {
                await Booking.update({
                    thumbs_up
                }, {
                    where: {
                        id: Number(id)
                    }
                });
                updateChefRating(booking.dataValues.chef_id, thumbs_up)
                if (decoded.user_role != 1) {
                    registerBookingLog(booking.dataValues.id, 'Rated')
                }
                res.status(200).json({ msg: "Booking has been rated successfully", success: true });
            } else if (!booking) {
                res.status(404).json({ msg: "Booking doesn't exist", success: false });
            }
            else {
                res.status(403).json({ msg: "Booking is already rated", success: false });
            }
        }
        else {
            throw "Unauthorized"
        }
    }
    catch (e) {
        console.log('e: ', e);
        res.status(500).json({ e });
    }

})

/* GET Booking by ID */
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            const booking = await Booking.findOne({
                where: { id: Number(id) },
                include: [{
                    model: Menu,
                    include: [
                        { model: MenuContent }
                    ]
                }, {
                    model: View_Quote,
                    attributes: ["menu", "price", "status"]
                }, {
                    model: Customer,
                    include: {
                        model: User, attributes: ['full_name', 'email'], required: true,
                        include: [
                            { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                        ]
                    }

                }, {
                    model: Chef,
                    include: {
                        model: User, attributes: ['full_name', 'email'], required: true,
                        include: [
                            { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                        ]
                    }
                }, {
                    model: Allergy,
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Cooker,
                    attributes: ['name'],
                },
                ]
            });
            res.status(200).json({ booking });
        } else {
            throw "Unauthorized"
        }

    } catch (e) {
        console.log('e: ', e);
        res.status(500).json({ e });
    }
});
// GET Booking Payments by Booking ID
router.get('/get-bookings-payment-details/:id', verifyToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            const bookingPayments = await chefPaymentTransfers.findAll(
                {
                    where: { chef_id: Number(id) },
                    attributes: ["chef_id", "booking_id", "status"],
                },
                { raw: true }
            );
            res.status(200).json({ bookingPayments });
        }
        else {
            throw "Unauthorized"
        }
    }
    catch (e) {
        res.status(500).json({ e });
    }
});

/* POST Booking */
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            const { body } = req;
            const {
                chef_id,
                customer_id,
                menu_id,
                people_count,
                event_date,
                cooker_id,
                notes,
                address,
                instructions,
                allergyIds,
                isPromotion,
                percent_off,
                amount_off,
                addressLine2,
                postCode
            } = body;

            let promise = await db.sequelize.query("set FOREIGN_KEY_CHECKS=0");
            const booking = await Booking.create({
                chef_id,
                customer_id,
                menu_id,
                people_count,
                address,
                instructions,
                event_date,
                cooker_id,
                notes,
                allergyIds,
                status: "pending",
                reference_id: 0,
                is_promotion: isPromotion ? 1 : 0,
                percent_off,
                addressline2: addressLine2,
                postcode: postCode,
                amount_off
            });

            const booking_allergies_array = [];
            for (let i = 0; i < allergyIds.length; i++) {
                booking_allergies_array.push({
                    bookingId: booking.id,
                    allergyId: allergyIds[i]
                })
            }

            const booking_allergies = await db.bookingAllergies.bulkCreate(booking_allergies_array, {
                returning: true
            })
            const menu = await Menu.findOne({
                where: { id: booking.menu_id },
                include: [
                    {
                        model: MenuContent,
                        through: {
                            attributes: [],
                        },
                    },
                ],
            });
            let tempArr = {
                title: menu.name,
                contents: []
            }
            for (let i = 0; i < menu.menu_contents.length; i++) {
                tempArr.contents.push({
                    title: menu.menu_contents[i].dataValues.title,
                    description: menu.menu_contents[i].dataValues.description
                })
            }
            const view_quote = await View_Quote.create({
                bookingId: booking.id,
                menu: JSON.stringify(tempArr),
                actual_menu_id: menu_id,
                cus_id: customer_id,
                status: 'quote_initiate',
                price: menu.price
            })

            const bb = await Booking.findOne({
                where: {
                    id: booking.id
                }
            })
            bookingEmail(JSON.parse(body.emailData).email, { ...JSON.parse(body.emailData), percent_off: percent_off ? percent_off : 0 }, bb.dataValues.reference_id)
            res.status(200).json({
                booking,
                booking_allergies
            })
        }
    }
    catch (e) {
        console.log("error booking post: ", e)
        res.status(500).json({
            msg: "Oops something went wrong",
            error: e
        })
    }

});

/* PUT Booking */
router.put('/:id', verifyToken, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            const {
                status,
                chef_id,
                menu_id,
                people_count,
                event_date,
                cooker_id,
                notes,
                address,
                instructions,
                allergyIds,
            } = body;
            const { id } = params;
            const updateObj = {
                ...(status && { status }),
                ...(chef_id && { chef_id }),
                ...(menu_id && { menu_id }),
                ...(people_count && { people_count }),

                ...(event_date && { event_date }),
                ...(cooker_id && { cooker_id }),
                ...(notes && { notes }),
                ...(address && { address }),
                ...(instructions && { instructions }),
            }

            await Booking.update(updateObj, {
                where: {
                    id: Number(id)
                }
            });

            const updatedBooking = await Booking.findAll({
                where: {
                    id: Number(id)
                }
            })
            let booking_allergies = [];

            if (allergyIds.length > 0) {
                const booking_allergies_array = [];
                for (let i = 0; i < allergyIds.length; i++) {
                    booking_allergies_array.push({
                        bookingId: Number(id),
                        allergyId: allergyIds[i]
                    })
                }


                await db.bookingAllergies.destroy({
                    where: {
                        bookingId: Number(id)
                    }
                })

                booking_allergies = await db.bookingAllergies.bulkCreate(booking_allergies_array, {
                    returning: true,
                    plain: true
                })
            }

            res.status(200).json({
                booking: updatedBooking,
                booking_allergies
            })
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }

});
// accept booking
router.put('/accept/:id', verifyToken, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const { id } = params
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            let resp = await Booking.update({
                status: "completed"
            }, {
                where: {
                    id: Number(id)
                }
            });
            if (resp[0] == 1) {
                BookingLog(id, 'accepted');
                res.status(200).json({ success: true, message: "booking succesfully accepted." })
            } else {
                res.status(200).json({ success: false, message: "" })
            }
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }
})
// accept quote by customer
router.put('/accept/quote/:id', verifyToken, chargeCustomerOnAcceptquote, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const { id } = params
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            let quoteresp = await View_Quote.update({
                status: "quote_accepted"
            }, {
                where: {
                    bookingId: Number(id)
                }
            });
            if (quoteresp[0] == 1) {
                const check = await registerBookingLog(id, 'accepted')
                res.status(200).json({ success: true, message: "booking succesfully accepted." })

            } else {
                res.status(200).json({ success: false, message: "" })
            }
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }
})
router.put('/modify/quote/:id', verifyToken, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const { id } = params
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            let quoteresp = await View_Quote.update({
                status: "quote_modified",
                menu: JSON.stringify(body.payload.menu),
                price: body.payload.price
            }, {
                where: {
                    bookingId: Number(id)
                }
            });
            if (quoteresp[0] == 1) {
                updateBookingEmail(JSON.parse(body.payload.emailData))
                const check = await registerBookingLog(id, 'modified')
                res.status(200).json({ success: true, message: "menu quote succesfully updated." })
            } else {
                res.status(200).json({ success: false, message: "" })
            }
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }
})
// decline quote by customer
router.put('/decline/quote/:id', verifyToken, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const { id } = params
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            let quoteresp = await View_Quote.update({
                status: "quote_initiate"
            }, {
                where: {
                    bookingId: Number(id)
                }
            });
            if (quoteresp[0] == 1) {
                res.status(200).json({ success: true, message: "booking succesfully accepted." })
            } else {
                res.status(200).json({ success: false, message: "" })
            }
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }
})
router.put('/cancel/:id', verifyToken, async (req, res, next) => {
    try {
        const { token, body, params } = req;
        const { id } = params
        const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
        if (decoded) {
            let resp = await Booking.update({
                status: "canceled"
            }, {
                where: {
                    id: Number(id)
                }
            });
            if (resp[0] == 1) {
                res.status(200).json({ success: true, message: "booking succesfully canceled." })
            } else {
                res.status(200).json({ success: false, message: "" })
            }
        }
    }
    catch (e) {
        res.status(500).json({
            msg: "Oops something went wrong"
        })
    }
})

router.get('/viewquote/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    try {
        const decoded = jwt.verify(req.token, process.env.AUTH_PASS_PHRASE);
        if (decoded && decoded.user_role === 3) {
            const quotes = await View_Quote.findOne({
                where: {
                    bookingId: Number(id)
                },
                attributes: ["id", "bookingId", "menu", "actual_menu_id", "cus_id", "status", "price"]
            })
            res.status(200).json({ quotes });
        } else {
            throw "Unauthorized"
        }

    } catch (e) {
        res.status(500).json({ e });
    }
});
// temporary api for updating viewquote table
router.get('/send/booking/to_viewquote', async (req, res) => {
    return res.status(400).send()
    try {
        const booking = await Booking.findAll({
            include: [{
                model: Menu,
                include: [
                    { model: MenuContent }
                ]
            }, {
                model: Customer,
                include: {
                    model: User, attributes: ['full_name', 'email'], required: true,
                    include: [
                        { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                    ]
                }

            }, {
                model: Chef,
                include: { model: User, attributes: ['full_name'], required: true, }
            }, {
                model: Allergy,
                through: {
                    attributes: [],
                },
            },
            {
                model: Cooker,
                attributes: ['name'],
            },
            ]
        });
        let mainTempArr = []
        for (let i = 0; i < booking.length; i++) {
            const menuquoteres = await View_Quote.findAll({ where: { bookingId: booking[i].id } })
            if (menuquoteres.length > 0) {
                continue;
            }

            let tempArr = {
                title: booking[i].menu.name,
                contents: []
            }
            for (let j = 0; j < booking[i].menu.menu_contents.length; j++) {
                tempArr.contents.push({
                    title: booking[i].menu.menu_contents[j].title,
                    description: booking[i].menu.menu_contents[j].description
                })
            }
            let objTemp = {
                bookingId: booking[i].id,
                menu: JSON.stringify(tempArr),
                actual_menu_id: booking[i].menu.id,
                cus_id: booking[i].customerId,
                status: 'quote_initiate',
                price: booking[i].menu.price
            }

            mainTempArr.push(objTemp)
        }
        const view_quote = await View_Quote.bulkCreate(mainTempArr)
        res.send(view_quote)
    } catch (e) {
        res.status(500).json({ e });
    }
})

// get booking logs by booking id
router.get('/bookinglogs/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const bookinglogs = await BookingLog.findAll({
            where: {
                bookingId: bookingId
            }
        })
        res.status(200).json({ bookinglogs })
    }
    catch (e) {
        res.status(500).json({ e })
    }
})

export default router;
