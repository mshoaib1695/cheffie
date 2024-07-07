import express from 'express';
import { stripe } from '../services/stripe';
import {
  StripePaymentMethod,
  StripePayment,
  chefPayments,
  chefPaymentTransfers,
} from '../models/index';
import db from '../models';
import verifyToken from '../middlewares/verifyToken';
import { registerBookingLog } from '../services/bookinglog';
import { chefConfirmBooking, newBookingChefEmail } from '../utils/email';
const { CHEFFIE_CHARGE } = process.env;

const { Op } = require("sequelize");

const Customer = db.customer;
const User = db.user;
const PhoneNumber = db.phoneNumber;
const Booking = db.booking;
const Chef = db.chef;
const Menu = db.menu;
const Cooker = db.cooker;
const Allergies = db.allergy;
const View_Quote = db.view_quote;

const router = express.Router();

router.post('/create-setup-intent', async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.setupIntents.create({
    payment_method_types: ['card'],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

const generateResponse = (intent) => {
  // Note that if your API version is before 2019-02-11, 'requires_action'
  // appears as 'requires_source_action'.
  if (
    intent.status === 'requires_action' &&
    intent.next_action.type === 'use_stripe_sdk'
  ) {
    // Tell the client to handle the action
    return {
      requires_action: true,
      payment_intent_client_secret: intent.client_secret,
    };
  } else if (
    intent.status === 'succeeded' ||
    intent.status === 'requires_capture'
  ) {
    // The payment didn’t need any additional actions and completed!
    // Handle post-payment fulfillment
    return {
      success: true,
      intent,
    };
  } else {
    // Invalid status
    return {
      error: 'Invalid PaymentIntent status',
    };
  }
};

router.post('/create-payment-intent', async (req, res) => {
  // Create a PaymentIntent with the order amount and currency
  const { body } = req;

  const booking = await Booking.findOne({
    where: { id: body.id },
  });
  const menu = await View_Quote.findOne({
    where: { bookingId: body.id },
  });
  const customerdata = await Customer.findOne({
    attributes: ['stripe_cus_id'],
    where: {
      id: body.customer_id,
    },
  });
  let totalCharge =
    parseFloat(menu.dataValues.price) * booking.dataValues.people_count;
  let discountAmount = 0;
  const isPromotion = booking.dataValues.is_promotion;
  const percent_off = booking.dataValues.percent_off;
  const amount_off = booking.dataValues.amount_off;

  if (isPromotion) {
    if (percent_off) {
      discountAmount = (percent_off / 100) * totalCharge;
      totalCharge = totalCharge - discountAmount;
    }
    if (amount_off) {
      totalCharge = totalCharge - amount_off;
      discountAmount = amount_off;
    }
  }

  let customer;
  if (customerdata.dataValues.stripe_cus_id) {
    customer = {
      id: customerdata.dataValues.stripe_cus_id,
    };
  } else {
    customer = await stripe.customers.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
    });
    const updateCustomer = await Customer.update(
      { stripe_cus_id: customer.id },
      {
        where: {
          id: body.customer_id,
        },
      }
    );
  }

  let payloadForPayMthd = {
    customer_id: body.customer_id,
    stripe_pm_id: body.payMethod,
    stripe_cust_id: customer.id,
  };
  const StripePaymentMethodResp = await StripePaymentMethod.create({
    ...payloadForPayMthd,
  });

  const updatedBooking = await Booking.update(
    { payment_id: StripePaymentMethodResp.dataValues.id },
    {
      where: {
        id: body.id,
      },
    }
  );
  try {
    const paymentMethodAttach = await stripe.paymentMethods.attach(
      body.payMethod,
      { customer: customer.id }
    );
    const intent = await stripe.paymentIntents.create({
      payment_method: body.payMethod,
      amount: parseInt(totalCharge.toFixed(2) * 100),
      currency: 'gbp',
      confirm: true,
      customer: customer.id,
      confirmation_method: 'manual',
      capture_method: 'manual',
      setup_future_usage: 'off_session',
    });
    res.status(200).json(generateResponse(intent));
  } catch (e) {
    console.log(e);
    res.status(401).json(e);
  }
});
router.post('/pay', verifyToken, async (request, response) => {
  const { body } = request;
  try {
    // find chef to get the email of chef
    const booking = await Booking.findOne({
      where: {
        id: body.booking_id
      }
    })
    let chefEamil = ''
    if (booking) {
      let chefId = booking.chef_id
      const chefObject = await Chef.findOne({
        include: [
          {
            model: User, attributes: ['email'], required: true,
          },
        ],
        where: {
          id: chefId
        },
      })
      const chef = JSON.parse(JSON.stringify(chefObject))
      chefEamil = chef?.user?.email
    }
    const updatedBooking = await Booking.update(
      { payment_intent_id: body.payment_intent_id },
      {
        where: {
          id: body.booking_id,
        },
      }
    );
    // generate email to chef
    let link = `${process.env.CLIENT_URL}/sign-in`
    newBookingChefEmail(chefEamil, "Please login to your profile to view your new booking request.", link)

    response.status(200).json({
      updatedBooking,
    });
  } catch (e) {
    return response.status(401).json({ error: e.message });
  }
});

async function bookingConfirm(bookingData) {
  const customerObject = await Customer.findOne({
    where: {
      id: bookingData.customerId,
    },
    include: [
      {
        model: User,
        attributes: ['full_name', 'email'],
        required: true,
        include: [
          {
            model: PhoneNumber,
            attributes: ['national_number'],
            required: true,
          },
        ],
      },
    ],
    // raw: true
  });
  const chefObj = await Chef.findOne({
    where: {
      id: bookingData.chefId,
    },
    include: [
      {
        model: User,
        attributes: ['full_name'],
        required: true,
      },
    ],
    // raw: true
  });
  const MenuObj = await Menu.findOne({
    where: {
      id: bookingData.menuId,
    },
    // raw: true
  });
  const CookerObj = await Cooker.findOne({
    where: {
      id: bookingData.cooker_id,
    },
    attributes: ['name'],
    raw: true,
  });
  return { customerObject, chefObj, MenuObj, CookerObj };
}

router.post('/charge', verifyToken, async (request, response) => {
  const { body } = request;
  const bookingObject = await Booking.findOne({
    where: {
      id: body.booking_id,
    },
    // include: [{ model: Allergies, attributes: ['name'], required: true }],
    include: [{ model: Allergies, attributes: ['name'] }],
    // raw: true
  });
  const menu = await View_Quote.findOne({
    where: { bookingId: body.booking_id, },
  });
  const checkPaymentRes = await StripePayment.findOne({
    where: {
      booking_id: body.booking_id,
    },
  });
  if (checkPaymentRes) {
    return response.status(400).json({ error: 'Booking already paid.' });
  } else {
    try {
      try {
        let intent;
        if (bookingObject.dataValues.payment_intent_id) {
          intent = await stripe.paymentIntents.retrieve(
            bookingObject.dataValues.payment_intent_id
          );
          let totalCharge =
            parseFloat(menu.dataValues.price) * bookingObject.dataValues.people_count;
          const chefAmount = ((100 - CHEFFIE_CHARGE) / 100) * totalCharge;

          if (intent.status != 'requires_capture') {
            intent = await stripe.paymentIntents.confirm(
              bookingObject.dataValues.payment_intent_id
            );
          }
          intent = await stripe.paymentIntents.capture(
            bookingObject.dataValues.payment_intent_id
          );
          let payload = {
            customer_id: body.customerid,
            booking_id: body.booking_id,
            str_charge_id: intent.charges.data[0].id,
            amount: parseFloat(intent.charges.data[0].amount / 100),
            paidout: parseFloat(intent.charges.data[0].amount / 100),
          };
          const StripePaymentRes = await StripePayment.create({
            ...payload,
          });
          const chefPaymentTransfersResp = await chefPaymentTransfers.create({
            chef_id: bookingObject.dataValues.chef_id,
            booking_id: bookingObject.dataValues.id,
            pay_method_id: bookingObject.dataValues.payment_id,
            customer_id: bookingObject.dataValues.customer_id,
            payment_id: StripePaymentRes.dataValues.id,
            total_amount: chefAmount,
            paid_amount: 0,
            remaining_amount: chefAmount,
            status: 'pending',
          });

          // mark booking and quote as accepted/confirmed here......
          const bookingUpdateConfirm = await Booking.update(
            { status: 'confirmed' },
            {
              where: {
                id: body.booking_id,
              },
            }
          );
          const viewQuoteUpdateConfirm = await View_Quote.update(
            { status: 'quote_accepted' },
            {
              where: {
                bookingId: body.booking_id,
              },
            }
          );
          const bookinglog = await registerBookingLog(
            body.booking_id,
            'accepted'
          );
          let data = await bookingConfirm(bookingObject);

          if (response.statusCode === 200) {
            chefConfirmBooking({ ...body, percent_off: bookingObject.dataValues.percent_off }, bookingObject, data);
          }
          response.status(200).json({ StripePaymentRes, intent });
        } else {
          return response
            .status(500)
            .json({ error: 'There are some issue with the payment method' });
        }
      } catch (e) {
        // Display error on client
        return response.status(401).json({ error: e.message });
      }
    } catch (e) {
      // Display error on client
      return response.status(401).json({ error: e.message });
    }
  }
  return;
});

router.post('/get-coupon', verifyToken, async (req, res, next) => {
  const { body } = req;
  try {
    const coupon = await stripe.coupons.retrieve(body.coupon);
    res.status(200).json({ coupon });
  } catch (e) {
    console.log('error in payment: ', e);
    res.status(400).json(e);
  }
});
router.post('/get-stripe-customer', verifyToken, async (req, res, next) => {
  try {
    const customerObj = await Customer.findOne({
      attributes: ['stripe_cus_id'],
      where: {
        id: req.body.customer,
      },
    });
    if (customerObj.dataValues.stripe_cus_id) {
      try {
        const customer = await stripe.paymentMethods.list({
          customer: customerObj.dataValues.stripe_cus_id,
          type: 'card',
        });
        res.status(200).json({ customer });
      } catch (e) {
        res.status(500).json({ e });
      }
    } else {
      res
        .status(500)
        .json({ status: false, error: 'no card found for this customer' });
    }
  } catch (e) {
    res.status(500).json({ e });
  }
});
router.delete('/delete-customer-card', verifyToken, async (req, res, next) => {
  const { id } = req.body;
  try {
    const reqresponse = await stripe.paymentMethods.detach(id);
    res
      .status(200)
      .json({ status: true, message: 'Payment method has been removed!' });
  } catch (e) {
    res.status(500).json({ e });
  }
});
router.post('/update-customer-payment-method', async (req, res, next) => {
  const { id } = req.body;
  try {
    const reqresponse = await stripe.paymentMethods.update(id);
    // res.status(200).json({ status: true, message: "Payment method has been updated!"})
    res.status(200).json({ reqresponse });
  } catch (e) {
    res.status(500).json({ e });
  }
});
router.post('/check-if-account-active', verifyToken, async (req, res, next) => {
  if (req.body.accid) {
    try {
      const accountLinks = await stripe.accounts.retrieve(req.body.accid);
      if (accountLinks.charges_enabled) {
        res.status(200).json({ active: accountLinks.charges_enabled });
      } else {
        res.status(401).json({ active: accountLinks.charges_enabled });
      }
    } catch (e) {
      res.status(401).json(e);
    }
  } else {
    res.status(401).json({ msg: 'Account id is missing.' });
  }
});
router.post('/createLoginLink', verifyToken, async (req, res, next) => {
  try {
    const accountResp = await stripe.accounts.retrieve(req.body.account);
    if (accountResp.charges_enabled) {
      try {
        const accountLinks = await stripe.accounts.createLoginLink(
          req.body.account
        );
        res.status(200).json({ accountLinks });
      } catch (e) {
        res.status(500).json({ e });
      }
    } else {
      try {
        const accountLinks = await stripe.accountLinks.create({
          account: req.body.account,
          refresh_url: `${process.env.CLIENT_URL}/chef/account/bookings/`,
          return_url: `${process.env.CLIENT_URL}/chef/account/bookings/`,
          type: 'account_onboarding',
        });
        res.status(200).json({ accountLinks });
      } catch (e) {
        res.status(500).json({ e });
      }
    }
  } catch (e) {
    res.status(500).json({ e });
  }
});
router.post('/create-stripe-account', verifyToken, async (req, res, next) => {
  let { chefId } = req.body;
  if (chefId) {
    try {
      const account = await stripe.accounts.create({
        country: 'GB',
        type: 'standard',
      });
      const updateChef = await Chef.update(
        { stripe_chef_id: account.id },
        {
          where: {
            id: chefId,
          },
        }
      );
      const accountLinks = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.CLIENT_URL}/chef/account/bookings/`,
        return_url: `${process.env.CLIENT_URL}/chef/account/bookings/`,
        type: 'account_onboarding',
      });
      res.status(200).json({ accountLinks });
    } catch (e) {
      res.status(500).json({ e });
    }
  } else {
    res.status(500).json({ message: 'Chef is required!' });
  }
});


router.post('/retrieve-account', async (req, res, next) => {
  try {
    const accountLinks = await stripe.accounts.retrieve(req.body.account);
    res.status(200).json({ accountLinks });
  } catch (e) {
    res.status(500).json({ e });
  }
});
router.post('/retrieve-payment-methods', async (req, res, next) => {
  try {
    const accountLinks = await stripe.paymentMethods.retrieve(req.body.account);
    res.status(200).json({ accountLinks });
  } catch (e) {
    res.status(500).json({ e });
  }
});

router.get('/get-all-pay-booking/:id', async (req, res) => {
  try {
    const booking = await Booking.findAll({
      where: {
        chef_id: req.params.id,
        status: 'confirmed'
      }
    })
    const transfers = await chefPaymentTransfers.findAll({
      where: {
        chef_id: req.params.id,
        status: {
          [Op.ne]: 'pending'
        }
      }
    })
    console.log(booking, transfers);
    res.status(200).json({ booking, transfers });
  }
  catch (e) {
    console.log("ERR: ", e);
    res.status(200).json(e);
  }
})


router.get('/get-chef-payments/:id', async (req, res) => {
  try {
    const payments = await chefPayments.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        chef_id: req.params.id,
        status: 'success',
      },
    });
    res.status(200).json({ payments });
  } catch (e) {
    res.status(200).json(e);
  }
});
router.get('/get-chef-invoice/:id', async (req, res, next) => {

  try {
    const payments = await chefPayments.findOne({
      attributes: ['chef_id', 'transfer_id'],
      where: {
        id: req.params.id
      },
    });
    const transfer = await chefPaymentTransfers.findOne({
      attributes: ['chef_id', 'booking_id'],
      where: {
        id: payments.dataValues.transfer_id
      },
    });
    const booking = await Booking.findOne({
      where: {
        id: transfer.dataValues.booking_id
      },
      include: [{
        model: View_Quote, attributes: ['price'], required: true,
      }]
    });
    const chef = await Chef.findOne({
      attributes: ['addressline1', 'addressline2', 'postcode'], required: true,
      where: {
        id: payments.dataValues.chef_id
      },
      include: [{
        model: User, attributes: ['full_name', 'email'], required: true,
      }]
    });
    res.status(200).json({ chef, booking });
  }
  catch (e) {
    console.log("ERR: ", e);
    res.status(200).json(e);
  }
});

export default router;
