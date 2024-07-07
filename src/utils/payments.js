import express from 'express';
import { stripe } from "../services/stripe"
import { StripePaymentMethod, StripePayment, Chef, chefPaymentTransfers } from '../models/index'
import db from '../models';
const { CHEFFIE_CHARGE } = process.env;

const Customer = db.customer;
const Booking = db.booking;
const View_Quote = db.view_quote;

export const chargeCustomerOnAcceptquote = async (req, res, next) => {
    const { id } = req.params;

    const checkPaymentRes = await StripePayment.findOne({
        where: {
            booking_id: id,
        }
    })
    const bookingObject = await Booking.findOne({
        where: {
            id: id,
        }
    })
    const viewQuoteObject = await View_Quote.findOne({
        where: {
            bookingId: id,
        }
    })

    const stripePaymentMethodResp = await StripePaymentMethod.findOne({
        where: {
            id: bookingObject.dataValues.payment_id
        }
    })

    let totalMenuPriceWithPersons = viewQuoteObject.dataValues.price * bookingObject.dataValues.people_count


    let totalCharge = totalMenuPriceWithPersons
    let discountAmount = 0


    if (bookingObject.dataValues.is_promotion) {
        if (bookingObject.dataValues.percent_off) {
            discountAmount = ((bookingObject.dataValues.percent_off / 100) * totalCharge)
            totalCharge = totalCharge - discountAmount
        }
        if (bookingObject.dataValues.amount_off) {
            discountAmount = bookingObject.dataValues.amount_off
            totalCharge = totalCharge - discountAmount
        }
    }

    if (checkPaymentRes) {
        return res.status(400).json({ error: "Booking already paid." });
    } else {
        try {
            const getCusId = await Chef.findOne({
                attributes: ["stripe_chef_id"],
                where: {
                    id: bookingObject.dataValues.chef_id
                },
            })
            if (getCusId.dataValues.stripe_chef_id == null) {
                return res.status(400).json({ error: "Chef is not verified by stripe" });
            }
            try {
                let intent;
                if (bookingObject.dataValues.payment_id) {
                    const paymentMethodREsp = await StripePaymentMethod.findOne(
                        {
                            attributes: ['stripe_pm_id'],
                            where: {
                                id: bookingObject.dataValues.payment_id
                            }
                        })

                    // Create the PaymentIntent
                    intent = await stripe.paymentIntents.retrieve(
                        bookingObject.dataValues.payment_intent_id
                    );

                    if (intent.status == "requires_payment_method") {
                        intent = await stripe.paymentIntents.update(
                            bookingObject.dataValues.payment_intent_id,
                            {
                                payment_method: paymentMethodREsp.dataValues.stripe_pm_id,
                                amount: parseInt(totalCharge.toFixed(2) * 100),
                            });
                    }

                    if (intent.amount == parseInt(totalCharge.toFixed(2) * 100)) {
                        if (intent.status == "requires_confirmation") {
                            intent = await stripe.paymentIntents.confirm(
                                intent.id
                            );
                        }
                        if (intent.status == "requires_action") {
                            res.status(200).json(intent)
                            return
                        }
                        if (intent.status == "requires_capture") {
                            intent = await stripe.paymentIntents.capture(
                                bookingObject.dataValues.payment_intent_id
                            );
                        }
                    }
                    if (intent.amount > parseInt(totalCharge.toFixed(2) * 100)) {
                        if (intent.status == "requires_confirmation") {
                            intent = await stripe.paymentIntents.confirm(
                                intent.id
                            );
                        }
                        if (intent.status == "requires_action") {
                            res.status(200).json(intent)
                            return
                        }
                        if (intent.status == "requires_capture") {
                            intent = await stripe.paymentIntents.capture(
                                bookingObject.dataValues.payment_intent_id, {
                                amount_to_capture: parseInt(totalCharge.toFixed(2) * 100)
                            }
                            );
                        }
                    }
                    if (intent.amount < parseInt(totalCharge.toFixed(2) * 100)) {
                       
                        intent = await stripe.paymentIntents.cancel(bookingObject.dataValues.payment_intent_id);
                        intent = await stripe.paymentIntents.create(
                            {
                                payment_method: stripePaymentMethodResp.dataValues.stripe_pm_id,
                                amount: parseInt(totalCharge.toFixed(2) * 100),
                                currency: 'gbp',
                                confirm: true,
                                customer: stripePaymentMethodResp.dataValues.stripe_cust_id,
                                confirmation_method: 'manual',
                                capture_method: 'manual',
                                setup_future_usage: "off_session"
                            }
                        );
                        const booigpayintend = await Booking.update(
                            { payment_intent_id: intent.id },
                            {
                                where: {
                                    id: id
                                }
                            }
                        )
                        if (intent.status == "requires_confirmation") {
                            intent = await stripe.paymentIntents.confirm(
                                intent.id
                            );
                        }
                        if (intent.status == "requires_action") {
                            res.status(200).json(intent)
                            return
                        }
                        if (intent.status == "requires_capture") {
                            intent = await stripe.paymentIntents.capture(
                                intent.id, {
                                amount_to_capture: parseInt(totalCharge.toFixed(2) * 100)
                            }
                            );
                        }
                    }

                    let payload = {
                        customer_id: bookingObject.dataValues.customer_id,
                        booking_id: id,
                        str_charge_id: intent.charges.data[0].id,
                        amount: parseFloat(intent.charges.data[0].amount_captured / 100),
                        paidout: parseFloat(intent.charges.data[0].amount_captured / 100),
                    }
                    const StripePaymentRes = await StripePayment.create({
                        ...payload
                    })                    
                    const chefAmount = ((100 - CHEFFIE_CHARGE) / 100) * totalMenuPriceWithPersons; 
                    // mark booking and quote as accepted/confirmed here......
                    const chefPaymentTransfersResp = await chefPaymentTransfers.create(
                        { 
                            chef_id: bookingObject.dataValues.chef_id,
                            booking_id: bookingObject.dataValues.id,
                            pay_method_id: bookingObject.dataValues.payment_id,
                            customer_id: bookingObject.dataValues.customer_id,
                            payment_id: StripePaymentRes.dataValues.id,
                            total_amount: chefAmount,
                            paid_amount: 0,
                            remaining_amount: chefAmount,
                            status: 'pending',
                        },
                        
                    )
                    const bookingUpdateConfirm = await Booking.update(
                        { status: 'confirmed' },
                        {
                            where: {
                                id: id
                            }
                        }
                    )
                    next()
                } else {
                    return res.status(500).json({ error: "Customer does not have any payment method." });
                }
            } catch (e) {
                // Display error on client
                console.log('here')
                return res.status(401).json({ error: e.message });
            }
        } catch (e) {
            // Display error on client
            console.log('here not')
            return res.status(401).json({ error: e.message, status: false });
        }
    }
    return
}

export const createAPayoutToChef = async (amount, acc_id) => {
    const payout = await stripe.payouts.create({
        amount: amount,
        currency: 'gbp',
    }, {
        stripeAccount: acc_id,
    });
}