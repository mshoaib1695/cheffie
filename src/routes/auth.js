import express from 'express';
var router = express.Router();
import verifyToken from "../middlewares/verifyToken"
import { encryptAES, decryptAES } from '../utils/crypto';
import { resetPasswordEmail, updatePasswordEmail, customerSignupEmail, chefAccountApproved } from '../utils/email';

const jwt = require('jsonwebtoken');
import dotenv from 'dotenv';
dotenv.config();
const tokenList = {}
import { getAllConfirmedBookings, getAllOutStandingBookings } from '../services/bookingReminder';

import db from '../models';
const User = db.user;
const Role = db.role;
const Customer = db.customer;
const Notifications = db.notifications;
const Chef = db.chef;
const ChefAreas = db.chefAreas;
const PhoneNumber = db.phoneNumber;
const ChefReq = db.chefReq;

/* GET Users */
router.get('/users', async (req, res, next) => {
    const users = await User.findAll();
    res.status(200).json({ users });
});
router.get('/run-schedular-for-email', function (req, res, next) {
    try {
        getAllConfirmedBookings()
        getAllOutStandingBookings()
        res.status(200).json({ msg: "success" })
    } catch {
        res.status(200).json({ msg: "failed" })

    }
});
const loginUserResponse = (roleBasedUser, user, email, cust) => {
    const userObject = {
        ...roleBasedUser,
        user_id: user.id,
        email,
        user_role: user.user_role,
        full_name: user.full_name
    }

    const token = jwt.sign(userObject, "xuHSYUmyJAHxWrNR", { expiresIn: process.env.TOKEN_EXPIRY })
    const refreshToken = jwt.sign(userObject, "SE7YMvebXzZ7Ymds", { expiresIn: process.env.REFRESH_TOKEN_EXPIRY })

    if (cust?.status) {
        const response = {
            status: "Logged in",
            token,
            ...roleBasedUser,
            full_name: user.full_name,
            cust_status: cust.status
        }
        tokenList[refreshToken] = response
        return [response, refreshToken];
    }
    else {
        const response = {
            status: "Logged in",
            token,
            ...roleBasedUser,
            full_name: user.full_name
        }
        tokenList[refreshToken] = response
        return [response, refreshToken];
    }
}
const generatePassword = () => {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$abcdefghijklmnopqrstuvwxyz";
    var string_length = 16;
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    if (randomstring.includes('@') || randomstring.includes('$') || randomstring.includes('#')) {
        return randomstring
    } else {
        let spChar = '@#$'
        let index = Math.round(Math.random() * (string_length - 1))
        let index2 = Math.round(Math.random() * 2)
        randomstring.replace(randomstring[index], spChar[index2])
        return randomstring
    }
}
// Create Chef Request 
router.post('/create-chef-req', async (req, res, next) => {
    const { full_name, email, ph_number, chef_details, work_rights, age, terms_conditions } = req.body;
    const password = generatePassword()
    const user_role = 2
    try {
        const userFound = await User.findOne({
            where: { email },
            attributes: ['id', 'email',],
        });
        if (userFound != null) {
            res.status(200).json({ success: false, message: 'Account already exists with the same email address.' });
            return
        }
        const user = await User.create({
            full_name,
            email,
            password: encryptAES(password),
            user_role,
        });
        const respPhone = await PhoneNumber.create({
            national_number: ph_number,
            user_id: user.id,
            country_code: '',
            dialing_code: ''
        })
        if (respPhone[0] == 0) {
            res.status(200).json({ success: false, message: 'error in updating user phone no.' });
            return
        }
        const respChefReq = await ChefReq.create({
            userId: user.id,
            password: password,
            isAccepted: 0,
            isRejected: 0,
            is18Plus: age ? 1 : 0,
            workRights: work_rights ? 1 : 0,
            termsCondition: terms_conditions ? 1 : 0,
            bio: chef_details
        })
        if (respChefReq[0] == 0) {
            res.status(200).json({ success: false, message: 'there is some issue with your application.' });
            return
        }
        res.status(200).json({ success: true, respPhone, user, respChefReq })
    } catch (e) {
        console.log(e)
        res.status(500).json({ msg: e });
    }
})
router.post('/accept-chef-req', async (req, res, next) => {
    const { id } = req.body;
    try {
        const chefreqres = await ChefReq.findOne({
            where: {
                id: id,
                isRejected: false,
                isAccepted: false
            }
        })
        if (chefreqres) {
            const createchefreq = await Chef.findOrCreate({
                where: {
                    user_id: chefreqres.dataValues.userId
                },
                defaults: {
                    user_id: chefreqres.dataValues.userId,
                    description: chefreqres.dataValues.bio,
                    intro: chefreqres.dataValues.bio,
                    // title: chefreqres.dataValues.bio,
                    city: "London",

                }
            })
            // create a default record in chefareas
            let chefArea = await ChefAreas.create({
                chefId: createchefreq[0]?.dataValues?.id
                ,
                post_code: 'default',
                status: 'default',
            })

            const chefreqresupdate = await ChefReq.update({
                isAccepted: true
            }, {
                where: {
                    id: id,
                }
            })
            const userdata = await User.findOne({
                where: {
                    id: chefreqres.dataValues.userId,
                },
                attributes: ['id', 'full_name', 'email',],
            })
            let userPassword = chefreqres.dataValues.password
            let userEmailAddress = userdata.dataValues.email
            let userName = userdata.dataValues.full_name;
            if (res.statusCode === 200) {
                chefAccountApproved(userEmailAddress, userName, userPassword);
            }
            res.status(200).json({ createchefreq, chefreqresupdate })
        } else {
            res.status(500).json({ msg: 'Chef request have been processed already.' })
        }
    }
    catch (e) {
        res.status(500).json({ msg: { ...e } });
    }
})
router.post('/decline-chef-req', async (req, res, next) => {
    const { id } = req.body;
    try {
        const chefreqres = await ChefReq.findOne({
            where: {
                id: id,
                isRejected: false,
                isAccepted: false
            }
        })
        if (chefreqres) {
            const createchefreq = await Chef.findOrCreate({
                where: {
                    user_id: chefreqres.dataValues.userId
                },
                defaults: {
                    user_id: chefreqres.dataValues.userId,
                    description: chefreqres.dataValues.bio,
                    intro: chefreqres.dataValues.bio,
                    // title: chefreqres.dataValues.bio,
                    city: "London",

                }
            })
            const chefreqresupdate = await ChefReq.update({
                isAccepted: false,
                isRejected: true
            }, {
                where: {
                    id: id,
                }
            })
            const userdata = await User.findOne({
                where: {
                    id: chefreqres.dataValues.userId,
                },
                attributes: ['id', 'full_name', 'email',],
            })
            let userPassword = chefreqres.dataValues.password
            let userEmailAddress = userdata.dataValues.email
            let userName = userdata.dataValues.full_name;
            if (res.statusCode === 200) {
                chefAccountApproved(userEmailAddress, userName, userPassword);
            }
            res.status(200).json({ createchefreq, chefreqresupdate })
        } else {
            res.status(500).json({ msg: 'Chef request have been processed already.' })
        }
    }
    catch (e) {
        res.status(500).json({ msg: { ...e } });
    }
})
/* POST User */
router.post('/user', async (req, res, next) => {
    const { full_name, email, password, user_role, ph_number } = req.body;
    try {
        const userFound = await User.findOne({
            where: { email },
            attributes: ['id', 'email',],
        });
        if (userFound != null) {
            res.status(200).json({ success: false, message: 'Account already exists with the same email address.' });
            return
        }
        const user = await User.create({
            full_name,
            email,
            password: encryptAES(password),
            user_role,
        });
        const cust = await Customer.findOne({
            where: {
                user_id: user.id
            },
            attributes: ['status'],
            raw: true
        });
        const role = await Role.findByPk(Number(user_role), { attributes: ['role_name'] });
        let roleBasedUser = {};
        if (role.role_name === 'customer') {
            const custUser = await Customer.create({
                user_id: user.id,
            });
            roleBasedUser.customer_id = custUser.id
        } else if (role.role_name === 'chef') {
            const chefUser = await Chef.create({
                user_id: user.id,
            });
            roleBasedUser.chef_id = chefUser.id
        }
        const respPhone = await PhoneNumber.create({
            national_number: ph_number,
            user_id: user.id,
            country_code: '',
            dialing_code: ''
        })
        if (respPhone[0] == 0) {
            res.status(200).json({ success: false, message: 'error in updating user phone no.' });
            return
        }
        const userResponse = user.toJSON();
        const [response, refreshToken] = loginUserResponse(roleBasedUser, userResponse, email, cust)
        setTokenCookie(res, refreshToken);
        if (role.role_name === 'customer') {
            const resp = { id: user.id, email: email, full_name: full_name };
            //   const token = jwt.sign(resp, "GDHSwsbvxsWEvl", { expiresIn: process.env.ACTIVATION_CUST_ACC_TOKEN_EXPIRY })
            const token = jwt.sign(resp, "GDHSwsbvxsWEvl") // removing token expiry, so that email link do not expire
            let link = `${process.env.CLIENT_URL}/verify?q=${token}`
            customerSignupEmail(email, full_name, link)
        }
        res.status(200).json({ ...response });
    } catch (e) {
        res.status(500).json({ msg: e });
    }
});
router.post('/verify-user-from-link', async (req, res, next) => {
    const { body } = req;
    const { token } = body;
    jwt.verify(token, "GDHSwsbvxsWEvl", async (err, decoded) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'User Verification failed.',
            });
        }
        try {
            const resp = await Customer.update(
                {
                    status: 'active'
                },
                {
                    where: {
                        user_id: decoded.id
                    }
                }
            )
            res.status(200).json({ success: true, message: "Customer verified successfully" });
        }
        catch (e) {
            console.log("Verify Error: ", e);
            return res.status(500).json({
                success: false,
                error: e,
            });
        }
    });
})

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
        const cust = await Customer.findOne({
            where: {
                user_id: user.id
            },
            attributes: ['status'],
            raw: true
        });
        const decryptedPass = decryptAES(user.password);
        const isPassValid = decryptedPass === password;

        if (!isPassValid) {
            return res.status(401).json({
                error: 'Email and password do not match.',
            });
        }

        const role = await Role.findByPk(user.user_role, { attributes: ['role_name'] });
        let roleBasedUser = {};
        if (role.role_name === 'customer') {
            const custUser = await Customer.findOne({
                attributes: ["id"],
                where: {
                    user_id: user.id
                },
            })
            roleBasedUser.customer_id = custUser.id
        } else if (role.role_name === 'chef') {
            const chefUser = await Chef.findOne({
                attributes: ["id", "on_board"],
                where: {
                    user_id: user.id
                },
            })
            roleBasedUser.chef_id = chefUser.id
            roleBasedUser.on_board = chefUser.on_board
        }
        const [response, refreshToken] = loginUserResponse(roleBasedUser, user, email, cust)
        setTokenCookie(res, refreshToken);
        res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(401).json({
            error: 'Email and password do not match.',
        });
    }
});
router.post('/reset', verifyToken, async (req, res, next) => {
    const { userId, password, newPassword, newReTypePassword } = req.body;

    try {
        const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
        if (decoded) {
            const user = await User.findOne(
                {
                    where: { id: userId },
                    attributes: ['id', 'email', 'password', 'user_role'],
                },
                { raw: true }
            );
            const decryptedPass = decryptAES(user.password);
            const isPassValid = decryptedPass === password;
            if (!isPassValid) {
                res.status(200).json({ success: false, message: "User Current Password is Invalid." });
                return
            }
            if (newPassword != newReTypePassword) {
                res.status(200).json({ success: false, message: "Both Passwords Does not match" });
                return
            }
            const resp = User.update(
                {
                    password: encryptAES(newPassword)
                },
                {
                    where: {
                        id: userId
                    }
                }
            )
            res.status(200).json({ success: true, message: "Password changed successfully" });
        }
    } catch (e) {
        console.log(e);
        return res.status(401).json({
            error: 'Email and password do not match.',
        });
    }
});

router.post('/refresh-token', async (req, res) => {
    // refresh the token
    const postData = req.headers
    // if refresh token exists
    if ((postData.refreshToken) && (postData.refreshToken in tokenList)) {
        const user = await User.findOne(
            {
                where: { email: postData.email },
                attributes: ['id', 'email', 'password', 'user_role'],
            },
            { raw: true }
        );
        const token = jwt.sign(user, "xuHSYUmyJAHxWrNR", { expiresIn: process.env.TOKEN_EXPIRY })
        const response = {
            "token": token,
        }
        // update the token in the list
        tokenList[postData.refreshToken].token = token
        res.status(200).json(response);
    } else {
        res.status(404).send('Invalid request')
    }
})

router.get('/user', verifyToken, async (req, res, next) => {
    const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
    if (decoded) {
        const { user_id, user_role } = decoded;
        const role = await Role.findByPk(user_role, { attributes: ['role_name'] });
        let userObj = {}
        if (role.role_name === 'customer') {
            userObj = await Customer.findOne({
                include: [
                    {
                        model: User, attributes: ['full_name', 'email'], required: true,
                        include: [
                            { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number'] }
                        ]
                    },
                ],
                where: {
                    user_id
                },
            })
        } else if (role.role_name === 'chef') {
            userObj = await Chef.findOne({
                include: [
                    {
                        model: User, attributes: ['full_name', 'email'], required: true,
                        include: [
                            { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                        ]
                    },
                    {
                        model: Menu, as: 'ppp', required: true, include: [
                            { model: Cuisine, as: 'cuisine', },
                            { model: MenuContents }
                        ]
                    },
                ],
                where: {
                    user_id
                },
            })
        }

        res.status(200).json(userObj)

    } else {
        res.status(401).json({ msg: "Unauthorized" })
    }
})

/* GET Roles */
router.get('/roles', async (req, res, next) => {
    const roles = await Role.findAll();
    res.status(200).json({ roles });
});
/* GET Customers */
router.get('/customers', async (req, res, next) => {
    const customers = await Customer.findAll();
    res.status(200).json({ customers });
});
/* GET Customers By ID*/
router.get('/customers/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    try {
        const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
        if (decoded) {
            const customer = await Customer.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: User, attributes: ["full_name", "email", "id"],
                        include: [
                            { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number',], required: true }
                        ]
                    }
                ]
            });
            res.status(200).json({ customer });
        }
    } catch (e) {
        res.status(500).json({ e });
    }
})
// Update Customer
router.get('/chef/stripe_id/:chefId', async (req, res, next) => {
    const { chefId } = req.params
    try {
        const chefUser = await Chef.findOne({
            attributes: ["stripe_chef_id"],
            where: {
                id: chefId
            },
        })
        res.status(200).json({ chefUser });

    }
    catch (e) {
        res.status(500).json({ e });
    }
})
router.put('/customers/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    const {
        name, email, phone
    } = req.body;

    try {
        const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
        if (decoded) {
            const user = await Customer.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: User, attributes: ["full_name", "id"],
                    }
                ]
            });
            const user_id = user.user.dataValues.id
            const phone_num = await PhoneNumber.findOne({
                where: {
                    user_id: user_id
                },
            });
            if (user.user.dataValues.full_name != name) {
                const respUser = await User.update(
                    {
                        full_name: name,
                    },
                    {
                        where: {
                            id: user_id
                        }
                    }
                )
                if (respUser[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user info' });
                    return
                }
            }
            if (phone_num.dataValues.national_number != phone) {
                const respPhone = await PhoneNumber.update({
                    national_number: phone
                },
                    {
                        where: {
                            user_id: user_id
                        }
                    })
                if (respPhone[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user phone no.' });
                    return
                }
            }

            res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ e });
    }
})
router.put('/chef/:id', verifyToken, async (req, res, next) => {
    const { id } = req.params;
    const { title, full_name, ph_number, addressLine1, addressLine2, postCode, dob, bio, } = req.body;

    try {
        const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
        if (decoded) {
            const chefupdate = await Chef.update({
                title, addressline1: addressLine1, addressline2: addressLine2, postcode: postCode, dob, description: bio
            }, {
                where: {
                    id: id
                },

            });
            const user = await Chef.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: User, attributes: ["full_name", "id"],
                    }
                ]
            });
            const user_id = user.user.dataValues.id
            const phone_num = await PhoneNumber.findOne({
                where: {
                    user_id: user_id
                },
            });
            if (user.user.dataValues.full_name != full_name) {
                const respUser = await User.update(
                    {
                        full_name: full_name,
                    },
                    {
                        where: {
                            id: user_id
                        }
                    }
                )
                if (respUser[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user info' });
                    return
                }
            }
            if (phone_num.dataValues.national_number != ph_number) {
                const respPhone = await PhoneNumber.update({
                    national_number: ph_number
                },
                    {
                        where: {
                            user_id: user_id
                        }
                    })
                if (respPhone[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user phone no.' });
                    return
                }
            }

            res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ e });
    }
})

router.post('/updatechefbyadmin', verifyToken, async (req, res, next) => {
    const {
        full_name,
        email,
        national_number,
        addressline1,
        addressline2,
        postcode,
        dob,
        description,
        city,
        id,
        intro,
        title
    } = req.body;

    try {
        const decoded = jwt.verify(req.token, "xuHSYUmyJAHxWrNR");
        if (decoded) {
            const chefupdate = await Chef.update({
                addressline1,
                addressline2,
                postcode,
                dob,
                description,
                city,
                postcode,
                intro,
                title
            }, {
                where: {
                    id: id
                },

            });
            const user = await Chef.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: User, attributes: ["full_name", "id"],
                    }
                ]
            });
            const user_id = user.user.dataValues.id
            const phone_num = await PhoneNumber.findOne({
                where: {
                    user_id: user_id
                },
            });
            if (user.user.dataValues.full_name != full_name || user.user.dataValues.email) {
                const respUser = await User.update(
                    {
                        full_name: full_name,
                        email: email,
                    },
                    {
                        where: {
                            id: user_id
                        }
                    }
                )
                if (respUser[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user info' });
                    return
                }
            }
            if (phone_num.dataValues.national_number != national_number) {
                const respPhone = await PhoneNumber.update({
                    national_number: national_number
                },
                    {
                        where: {
                            user_id: user_id
                        }
                    })
                if (respPhone[0] == 0) {
                    res.status(200).json({ success: false, message: 'error in updating user phone no.' });
                    return
                }
            }

            res.status(200).json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ e });
    }
})

/* GET Users */
router.get('/chefs', async (req, res, next) => {
    const chefs = await Chef.findAll();
    res.status(200).json({ chefs });
});
router.get('/chefById/:id', async (req, res, next) => {
    const chef = await Chef.findOne({
        attributes: ['id', 'description', 'image', 'intro', 'rating', 'reviews', 'on_board', 'isProfileApproved'],
        where: {
            id: req.params.id
        }
    });
    res.status(200).json({ chef });
});
router.get('/chef/:id', async (req, res, next) => {
    const chef = await Chef.findOne({
        where: {
            id: req.params.id
        },
        include: [
            {
                model: User, attributes: ['full_name', 'email'], required: true,
                include: [
                    { model: PhoneNumber, attributes: ['country_code', 'dialing_code', 'national_number'] }
                ]
            },
        ]
    });
    res.status(200).json({ chef });
});
router.get('/sendtestemail', async (req, res, next) => {
    const { body } = req
    const { email } = body
    let text = `${process.env.CLIENT_URL}/reset-password?q=${'token'}`
    await resetPasswordEmail(email, text)
    res.status(200).json({ success: true, data: { email } })
})
router.post('/forget-password', async (req, res, next) => {
    const { body } = req
    const { email } = body
    try {
        const userRes = await User.findOne({
            where: {
                email: email
            },
            attributes: ['id', 'email', 'password', 'user_role', "full_name"],
        })
        if (userRes === null) {
            return res.status(200).json({ success: false, message: "User with given email doesn't exist" });
        }
        else {
            const resp = { email: userRes.dataValues.email, id: userRes.dataValues.id, name: userRes.dataValues.full_name }
            const token = jwt.sign(resp, "LjsJSDKlkhASWrNR", { expiresIn: process.env.FORGETPASS_TOKEN_EXPIRY })
            let text = `${process.env.CLIENT_URL}/reset-password?q=${token}`
            resetPasswordEmail(email, text)
            res.status(200).json({ success: true, data: { email, token } })
        }
    }
    catch (e) {
        res.status(500).json({ e })
    }
})
router.post('/reset-password-from-link', async (req, res, next) => {
    const { body } = req
    const { token, password, confirmPassword } = body
    jwt.verify(token, "LjsJSDKlkhASWrNR", async (err, decoded) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'User Authentication failed.',
            });
        }
        try {
            if (password === confirmPassword) {
                const resp = await User.update(
                    {
                        password: encryptAES(password)
                    },
                    {
                        where: {
                            id: decoded.id
                        }
                    }
                )

                updatePasswordEmail(decoded.email)
                res.status(200).json({ success: true, message: "Password changed successfully" });
            } else {
                res.status(500).json({ success: false, error: 'password and re-type password does not match.' })
            }
        }
        catch (e) {
            return res.status(500).json({
                success: false,
                error: e,
            });
        }
    });
})
router.get('/get-notification-by-user/:userid', async (req, res) => {
    const userid = req.params.userid
    try {
        const reqFromDB = await Notifications.findOrCreate({
            where: {
                user_id: userid,
            },
            defaults: {
                user_id: userid,
                app_notifications: 0,
                news_offers_notifications: 0,
            }
        })

        res.status(200).json(reqFromDB[0].dataValues)
    }
    catch (e) {
        res.status(404).json(e)
    }
})
router.put('/update-notification-by-user/:userid', async (req, res) => {
    const userid = req.params.userid
    const { app_notifications, news_offers_notifications } = req.body
    try {
        const reqFromDB = await Notifications.update({
            app_notifications: app_notifications ? 1 : 0,
            news_offers_notifications: news_offers_notifications ? 1 : 0
        }, {
            where: {
                user_id: userid
            }
        })
        res.status(200).json(reqFromDB.dataValues)
    }
    catch (e) {
        res.status(401).json('not found')
    }
})
export default router;

function setTokenCookie(res, token) {
    // create http only cookie with refresh token that expires at given ms
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000)
    };
    res.cookie('refreshToken', token, cookieOptions);
}
