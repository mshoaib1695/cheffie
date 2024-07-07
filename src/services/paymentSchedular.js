import { Booking, chefPaymentTransfers, Chef, StripePayment, chefPayments } from "../models"
import moment from 'moment'
import { stripe } from "./stripe";
const { Op } = require("sequelize");
const { VAT } = process.env;


const transferToChef = async () => {
    return new Promise(async (accept, reject) => {
        try {
            const chefTransfers = await chefPaymentTransfers.findAll({
                where: {
                    status: {
                        [Op.eq]: 'pending'
                    }
                }
            });
            for (let i = 0; i < chefTransfers.length; i++) {
                try {
                    const chefBooking = await Booking.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.booking_id,
                        }
                    });
                    const chefData = await Chef.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.chef_id
                        }
                    });
                    const payment = await StripePayment.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.payment_id
                        }
                    });
                    // const totalAmount = chefTransfers[i].dataValues.total_amount / 2
                    const totalAmount = payment.dataValues.amount / 2 // total amount to be paid
                    const tax = (VAT / 100) * totalAmount;
                    const totalAfterTaxDeduction = totalAmount - tax

                    var event = moment(chefBooking.dataValues.event_date);
                    var today = moment(moment().toDate());
                    if (event.diff(today, 'hours', true) < 72) {
                        if (chefData.dataValues.stripe_chef_id) {
                            try {
                                const transfer = await stripe.transfers.create({
                                    amount: totalAfterTaxDeduction.toFixed(2) * 100,
                                    currency: "gbp",
                                    // source_transaction: customerDate.dataValues.str_charge_id,
                                    destination: chefData.dataValues.stripe_chef_id,
                                });

                                const chefPayment = chefPayments.create({
                                    chef_id: chefTransfers[i].dataValues.chef_id,
                                    transfer_id: chefTransfers[i].dataValues.id,
                                    stripe_transfer_id: transfer.id,
                                    amount: totalAmount,
                                    paidout: totalAfterTaxDeduction,
                                    tax: tax,
                                    status: 'success',
                                })
                                const chefPaymentTransferUpdate = chefPaymentTransfers.update({
                                    paid_amount: totalAmount,
                                    remaining_amount: chefTransfers[i].dataValues.total_amount - totalAmount,
                                    status: 'partial',
                                }, {
                                    where: {
                                        id: chefTransfers[i].dataValues.id
                                    }
                                })
                            }
                            catch (e) {
                                console.log(e)
                                res.status(200).json(e)
                            }
                        } else {
                            const chefPayment = chefPayments.create({
                                chef_id: chefTransfers[i].dataValues.chef_id,
                                transfer_id: chefTransfers[i].dataValues.id,
                                stripe_transfer_id: '',
                                amount: totalAmount,
                                paidout: totalAfterTaxDeduction,
                                tax: tax,
                                status: 'failed',
                            })
                        }
                    }
                }
                catch (e) {

                }
            }
            accept(chefTransfers)
        } catch (e) {
            reject({ e });
        }
    });
}
const transferToChefAfterBooking = async () => {
    return new Promise(async (accept, reject) => {
        try {
            const chefTransfers = await chefPaymentTransfers.findAll({
                where: {
                    status: {
                        [Op.eq]: 'partial'
                    }
                }
            });
            for (let i = 0; i < chefTransfers.length; i++) {
                try {
                    const chefBooking = await Booking.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.booking_id,
                        }
                    });
                    const chefData = await Chef.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.chef_id
                        }
                    });
                    const payment = await StripePayment.findOne({
                        where: {
                            id: chefTransfers[i].dataValues.payment_id
                        }
                    });
                    const totalAmount = chefTransfers[i].dataValues.remaining_amount
                    const tax = (VAT / 100) * totalAmount;
                    const totalAfterTaxDeduction = totalAmount - tax

                    var event = moment(chefBooking.dataValues.event_date);
                    var today = moment(moment().toDate());

                    if (today.diff(event, 'hours', true) > 24) {
                        if (chefData.dataValues.stripe_chef_id) {
                            try {
                                const transfer = await stripe.transfers.create({
                                    amount: (totalAfterTaxDeduction.toFixed(2)) * 100,
                                    currency: "gbp",
                                    // source_transaction: customerDate.dataValues.str_charge_id,
                                    destination: chefData.dataValues.stripe_chef_id,
                                });
                                const chefPayment = chefPayments.create({
                                    chef_id: chefTransfers[i].dataValues.chef_id,
                                    transfer_id: chefTransfers[i].dataValues.id,
                                    stripe_transfer_id: transfer.id,
                                    amount: totalAmount,
                                    paidout: totalAfterTaxDeduction,
                                    tax: tax,
                                    status: 'success',
                                })
                                let total = parseFloat(chefTransfers[i].dataValues.remaining_amount) + parseFloat(chefTransfers[i].dataValues.paid_amount)
                                const chefPaymentTransferUpdate = chefPaymentTransfers.update({
                                    paid_amount: total,
                                    remaining_amount: chefTransfers[i].dataValues.total_amount - total,
                                    status: 'complete',
                                }, {
                                    where: {
                                        id: chefTransfers[i].dataValues.id
                                    }
                                })
                            }
                            catch (e) {
                                console.log(e)
                                res.status(200).json(e)
                            }
                        } else {
                            const chefPayment = chefPayments.create({
                                chef_id: chefTransfers[i].dataValues.chef_id,
                                transfer_id: chefTransfers[i].dataValues.id,
                                stripe_transfer_id: '',
                                amount: totalAmount,
                                paidout: totalAfterTaxDeduction,
                                tax: tax,
                                status: 'failed',
                            })
                        }
                    }
                }
                catch (e) {

                }
            }
            accept(chefTransfers)
        } catch (e) {
            reject({ e });
        }
    });
}

export {
    transferToChef,
    transferToChefAfterBooking
}