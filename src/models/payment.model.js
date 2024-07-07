
const Payment = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { STRING, INTEGER, DOUBLE, DATE } = DataTypes
    const StripePaymentMethod = sequelize.define("strp_pay_method", {
        customer_id: {
            type: INTEGER
        },
        stripe_pm_id: {
            type: STRING
        },
        stripe_cust_id: {
            type: STRING
        },
        createdAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
    });
    const StripePayment = sequelize.define("payment", {
        customer_id: {
            type: INTEGER
        },
        booking_id: {
            type: INTEGER
        },
        str_charge_id: {
            type: STRING
        },
        amount: {
            type: DOUBLE
        },
        paidout: {
            type: DOUBLE
        },
        createdAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
    });
    const chefPaymentTransfers = sequelize.define("chef_payment_transfers", {
        id: {
            type: INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        chef_id: {
            type: INTEGER
        },
        booking_id: {
            type: INTEGER
        },
        payment_id: {
            type: INTEGER
        },
        customer_id: {
            type: INTEGER
        },
        pay_method_id: {
            type: STRING
        },
        total_amount: {
            type: DOUBLE
        },
        paid_amount: {
            type: DOUBLE
        },
        remaining_amount: {
            type: DOUBLE
        },
        status: {
            type: STRING
        },
        created_at: {
            type: DATE, defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DATE, defaultValue: DataTypes.NOW
        },
    },{
        timestamps: false,
        underscored: true
    });
    const chefPayments = sequelize.define("chef_payments", {
        id: {
            type: INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        chef_id: {
            type: INTEGER
        },
        transfer_id: {
            type: INTEGER
        },
        stripe_transfer_id: {
            type: INTEGER
        },
        amount: {
            type: DOUBLE
        },
        tax: {
            type: DOUBLE
        },
        paidout: {
            type: DOUBLE
        },
        status: {
            type: STRING
        },
        createdAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DATE, defaultValue: DataTypes.NOW
        },
    });


    return { StripePaymentMethod, StripePayment, chefPaymentTransfers, chefPayments };

}

export default Payment