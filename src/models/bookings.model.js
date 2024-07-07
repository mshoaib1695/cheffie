import { Allergy, Cooker, Menu, Customer, Chef } from './index';
import {registerBookingLog} from '../services/bookinglog'

const BookingSchema = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;
  const { STRING, INTEGER, DATE, JSON, BOOLEAN } = DataTypes;
  const BOOKING_REFERENCE_SEED_ID = 20210;
  const Booking = sequelize.define(
    'booking',
    {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      chef_id: {
        type: INTEGER,
      },
      customer_id: {
        type: INTEGER,
      },
      menu_id: {
        type: INTEGER,
      },
      people_count: {
        type: INTEGER,
      },
      event_date: {
        type: DATE,
      },
      cooker_id: {
        type: INTEGER,
      },
      notes: {
        type: STRING,
      },
      payment_intent_id: {
        type: STRING,
      },
      invoice_id: {
        type: INTEGER,
      },
      address: {
        type: STRING,
      },
      status: {
        type: STRING,
      },
      instructions: {
        type: STRING,
      },
      addressline2: {
        type: STRING,
      },
      postcode: {
        type: STRING,
      },
      reference_id: {
        type: INTEGER,
      },
      thumbs_up: {
        type: BOOLEAN
      },
      is_promotion: {
        type: BOOLEAN
      },
      amount_off: {
        type: INTEGER,
      },
      percent_off: {
        type: INTEGER,
      },
      payment_id: {
        type: INTEGER,
      },
    },
    {
      underscored: true,
    }
  );
  const BookingLog = sequelize.define(
    'booking_log',
    {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      bookingId: {
        type: INTEGER,
      },
      action: {
        type: INTEGER,
      },
    },
    {
      underscored: false,
    }
  );
  const View_Quote = sequelize.define(
    'view_quote',
    {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      bookingId: {
        type: INTEGER,
      },
      menu: {
        type: JSON,
      },
      actual_menu_id: {
        type: INTEGER,
      },
      cus_id: {
        type: INTEGER,
      },
      status: {
        type: STRING,
      },
      price: {
        type: INTEGER,
      },
      createdAt: {
        type: DATE, defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DATE, defaultValue: DataTypes.NOW
      }, 
    }
  );

  Booking.addHook('afterCreate', async (booking) => {
    // We can use `options.transaction` to perform some other call
    // using the same transaction of the call that triggered this hook
    await booking.update({ reference_id: BOOKING_REFERENCE_SEED_ID + booking.id}); 
    await registerBookingLog(booking.id, 'created')
  });
  Booking.hasOne(View_Quote); 
  Booking.belongsTo(Menu);
  Booking.belongsTo(Customer);
  // Chef.hasMany(Booking);
  Booking.belongsTo(Chef);
  BookingLog.belongsTo(Booking);
  Booking.belongsTo(Cooker);
  Booking.belongsToMany(Allergy, { through: 'booking_allergies' });
  return { Booking, View_Quote, BookingLog };
};

export default BookingSchema;
