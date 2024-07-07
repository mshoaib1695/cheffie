import express from 'express';
var router = express.Router();
import { decryptAES } from '../utils/crypto';
import verifyToken from "../middlewares/verifyToken"
const { Op } = require("sequelize");
import { updateChefStatus } from '../utils/chef';
// import { chefAccountApproved } from '../utils/email';

import dotenv from 'dotenv';
dotenv.config();
const jwt = require('jsonwebtoken');

import db, { ChefReq } from '../models';
import { isObject, objectIsEmpty } from '../utils';
import moment from 'moment';

const tokenList = {}
const User = db.user;
const ChefAvailibility = db.chefAvailibility;
const Customer = db.customer;
const ChefAreas = db.chefAreas;
const Chef = db.chef;
const PhoneNumber = db.phoneNumber;
const Booking = db.booking;
const ViewQuote = db.view_quote;

const loginUserResponse = (user, email) => {
    const userObject = {
        user_id: user.id,
        email,
        user_role: user.user_role,
        full_name: user.full_name
    }
    const token = jwt.sign(userObject, process.env.AUTH_PASS_PHRASE, { expiresIn: process.env.TOKEN_EXPIRY })
    const response = {
        status: "Logged in",
        token,
        full_name: user.full_name,
        email
    }
    return [response];
}

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne(
            {
                where: { email },
                attributes: ['id', 'email', 'password', 'user_role', 'full_name'],
            },
            { raw: true }
        );
        const decryptedPass = decryptAES(user.password);
        const isPassValid = decryptedPass === password;

        if (!isPassValid) {
            return res.status(401).json({
                error: 'Email and password do not match.',
            });
        }
        if (user.user_role == 1) {
            const [response] = loginUserResponse(user, email)
            res.status(200).json(response);
        } else {
            return res.status(401).json({
                error: 'Email and password do not match.',
            });
        }
    } catch (e) {
        console.log(e);
        return res.status(401).json({
            error: 'Email and password do not match.',
        });
    }
});
const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows } = data;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);
    const last = currentPage == totalPages
    return { totalItems, rows, totalPages, currentPage, last };
};
router.get('/customers', verifyToken, async (req, res, next) => {
    const { page, size, name } = req.query
    let offset = (page - 1) * size
    let limit = Number(size)
    let nameFilter = name ? name : ''
    try {
        const cusReq = await Customer.findAndCountAll({
            offset,
            limit,
            order: [['created_date', 'DESC']],
            include: [{
                model: User, attributes: ['full_name', 'email'], required: true,
                where: {
                    full_name: { [Op.like]: "%" + nameFilter + "%" }
                }
            }]
        });
        // include phoneNumbers
        let userIds = []
        for (let customer of cusReq.rows) {
            if (customer.dataValues.user_id) {
                userIds.push(customer.dataValues.user_id)
            }
        }
        let phoneReq = await PhoneNumber.findAll({
            where: {
                user_id: userIds
            }
        })
        console.log("debug phoneReq : ", phoneReq)
        res.status(200).json({ ...getPagingData(cusReq, page, limit), phoneNumbers: phoneReq })
    }
    catch (e) {
        res.status(401).json(e)
    }
})
router.get('/chefs', verifyToken, async (req, res, next) => {
    const { page, size, name } = req.query
    let offset = (page - 1) * size
    let limit = Number(size)
    let nameFilter = name ? name : ''
    try {
        const cusReq = await Chef.findAndCountAll({
            offset,
            limit,
            order: [['created_at', 'DESC']],
            include: [{
                model: User, attributes: ['full_name', 'email'], required: true,
                where: {
                    full_name: { [Op.like]: "%" + nameFilter + "%" }
                }
            }]
        });
        res.status(200).json(getPagingData(cusReq, page, limit))
    }
    catch (e) {
        res.status(401).json(e)
    }
})
router.get('/bookings', verifyToken, async (req, res, next) => {
    const { page, size, name, customer, chef, phone, date, status } = req.query;

    let offset = (page - 1) * size
    let limit = Number(size)
    let nameFilter = name ? name : ''
    let chefFilter = chef ? chef : ''
    let phoneFilter = phone ? phone : ''
    let dateFilter = date ? date : ''
    let statusFilter = status ? status : ''

    let customerQuery = {}
    if (customer) {
        customerQuery = {
            where: {
                customer_id: customer
            }
        }
    }
    let whereClause = {};
    if (dateFilter || statusFilter) {
        if (date) {
            whereClause = (date && JSON.parse(date))
                ?
                {
                    where: {
                        event_date: { [Op.or]: JSON.parse(date) }
                    }
                }
                :
                {
                    where: {
                        status: { [Op.or]: JSON.parse('pending') }
                    }
                }
        }
        if (status) {
            whereClause = (status && JSON.parse(status))
                ?
                {
                    where: {
                        status: { [Op.or]: JSON.parse(status) }
                    }
                }
                :
                {
                    where: {
                        status: { [Op.or]: JSON.parse('pending') }
                    }
                }
        }
        if (date && status) {
            whereClause = (date && JSON.parse(date) && (status && JSON.parse(status)))
                ?
                {
                    where: {
                        event_date: { [Op.or]: JSON.parse(date) },
                        status: { [Op.or]: JSON.parse(status) }
                    }
                }
                :
                {
                    where: {
                        status: { [Op.or]: JSON.parse('pending') }
                    }
                }
        }
    }

    try {
        const cusReq = await Booking.findAndCountAll({
            offset,
            limit,
            ...customerQuery,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: ViewQuote, attributes: ['id', 'price'], required: true,
                },
                {
                    model: Chef, attributes: ['id', 'image'], required: true,
                    include: [
                        {
                            model: User, attributes: ['full_name'], required: true,
                            where: {
                                full_name: { [Op.like]: "%" + chefFilter + "%" }
                            },
                        }
                    ]
                },
                {
                    model: Customer, attributes: ['id'], required: true,
                    include: [
                        {
                            model: User, attributes: ['full_name'], required: true,
                            where: {
                                full_name: { [Op.like]: "%" + nameFilter + "%" }
                            },
                            include: [
                                {
                                    model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true,
                                    where: {
                                        national_number: { [Op.like]: "%" + phoneFilter + "%" }
                                    },
                                }
                            ]
                        }
                    ]
                },

            ],
            whereClause
        });
        res.status(200).json(getPagingData(cusReq, page, limit))
    }
    catch (e) {
        res.status(401).json(e)
    }
})
router.get('/chefreqs', verifyToken, async (req, res, next) => {
    const { page, size, name, email } = req.query
    let offset = (page - 1) * size
    let limit = Number(size)
    let nameFilter = name ? name : ''
    let emailFilter = email ? email : ''

    try {
        const cusReq = await ChefReq.findAndCountAll({
            offset,
            limit,
            where: {
                isAccepted: { [Op.not]: true }
            },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User, attributes: ['full_name', 'email'], required: true,
                    where: {
                        full_name: { [Op.like]: `%${nameFilter}%` },
                        email: { [Op.like]: `%${emailFilter}%` }
                    },
                    include: [
                        { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                    ]
                }
            ]
        });
        res.status(200).json(getPagingData(cusReq, page, limit))
    }
    catch (e) {
        console.log(e)
        res.status(401).json(e)
    }
})
router.post('/chefareas/onsave', verifyToken, async (req, res, next) => {
    const { chefId, areas } = req.body

    let addedItems = areas.filter(i => i.id == null)
    let deletedItems = areas.filter(i => i.status == 'deleted')
    let updateItems =
        areas.filter(i => i.status != 'deleted' && i.id != null)
            .map(i => {
                return {
                    id: i.id,
                    chef_id: i.chef_id,
                    post_code: i.post_code,
                    status: i.status,
                }
            })

    let bulkcreate = addedItems.map(item => {
        return {
            chefId: chefId,
            post_code: item.post_code,
            status: 'accepted'
        }
    })
    let bulkdeleteItems = deletedItems.map(i => {
        return i.id
    })
    try {
        const areasCreation = await ChefAreas.bulkCreate(bulkcreate)
        const areasDeletion = await ChefAreas.destroy({
            where: {
                id: bulkdeleteItems
            }
        })
        const areasUpdate = await ChefAreas.bulkCreate(updateItems, {
            fields: ["id", "chef_id", "post_code", "status"],
            updateOnDuplicate: ["status"]
        })

        updateChefStatus(chefId)
        res.status(200).json({ areasCreation, areasDeletion, areasUpdate })
    }
    catch (e) {
        console.log(e)
        res.status(401).send(e)
    }

})
router.post('/update/availability', verifyToken, async (req, res, next) => {
    const { body } = req;
    const { starting_date, ending_date, starting_time, ending_time, chef_id, status, id } = body;
    try {
        const query = await ChefAvailibility.update({
            starting_date, ending_date, starting_time, ending_time, chef_id, status
        },
            {
                where: {
                    id: id
                }
            })
        updateChefStatus(chef_id)

        res.status(200).json({ ...query });
    }
    catch (e) {
        res.status(500).json({ e });
    }
})
router.put('/updateall/availability', verifyToken, async (req, res, next) => {
    const { body } = req;
    const { chef_id, status } = body;
    try {
        const query = await ChefAvailibility.update({
            status
        }, {
            where: {
                ending_date: {
                    [Op.gt]: new Date().toISOString().split('T')[0]
                },
                chef_id
            }
        })
        updateChefStatus(chef_id)

        res.status(200).json({ ...query });
    }
    catch (e) {
        console.log(e)
        res.status(500).json({ e });
    }
})
router.post('/accept-chef-profile', verifyToken, async (req, res) => {
    const { chef_id, status } = req.body;
    try {
        const chefRes = await Chef.update({ isProfileApproved: status }, {
            where: {
                id: chef_id
            }
        })
        // const userFound = await User.findOne({
        //   where: { chef_id },
        //   attributes: ['id', 'email',],
        // });
        updateChefStatus(chef_id);
        // if(res.statusCode === 200){
        //   chefAccountApproved(userFound.email);
        // }
        res.status(200).json({ ...chefRes })
    }
    catch (e) {
        res.status(400).json(e)
    }
})

export default router;