import { Booking, User, Chef, Customer, PhoneNumber, Menu, Cooker, View_Quote, Allergy } from "../models"
import moment from 'moment';
import { chefReminderBookingEmail, outstandingBookingsEmail } from "../utils/email";

const { Op } = require("sequelize");


const getAllConfirmedBookings = async () => {
  try {
    let eventDate = new Date()
    eventDate.setHours(eventDate.getHours() + 48);
    let eventDate2 = new Date()
    eventDate2.setHours(eventDate2.getHours() + 54);

    const bookingData = await Booking.findAll({
      where: {
        status: 'confirmed',
        [Op.and]: [
          {
            event_date: {
              [Op.lte]: eventDate2,
            },
          },
          {
            event_date: {
              [Op.gte]: eventDate,
            },
          },
        ],
      },
      include: [
        {
          model: Allergy
        }
      ]
    });

    for (let i = 0; i < bookingData.length; i++) {
      let customerObject = await Customer.findOne({
        where: {
          id: bookingData[i].dataValues.customerId,
        },
        include: [
          {
            model: User, attributes: ['full_name', 'email'], required: true,
            include: [
              {
                model: PhoneNumber, attributes: ['national_number'], required: true
              }
            ]
          }
        ],
      });
      let chefObj = await Chef.findOne({
        where: {
          id: bookingData[i].dataValues.chefId,
        },
        include: [
          {
            model: User, attributes: ['full_name', 'email'], required: true,
          }
        ],
      });
      let MenuObj = await Menu.findOne({
        where: {
          id: bookingData[i].dataValues.menuId,
        },
      });
      let CookerObj = await Cooker.findOne({
        where: {
          id: bookingData[i].dataValues.cooker_id,
        },
        attributes: ['name'],
        raw: true
      });
      let priceObj = await View_Quote.findOne({
        where: {
          bookingId: bookingData[i].dataValues.id,
        },
        attributes: ['price'],
        raw: true
      });
      let totalAmount = (priceObj.price * bookingData[i].people_count) && (priceObj.price * bookingData[i].people_count).toFixed(2);
      let emailData = {
        name: customerObject?.dataValues?.user?.dataValues?.full_name,
        email: customerObject?.dataValues?.user?.dataValues?.email,
        phone: customerObject?.dataValues?.user?.dataValues?.phone_numbers[0]?.dataValues?.national_number,
        date: moment(bookingData[i]?.event_date).format('DD-MM-YYYY'),
        time: moment(bookingData[i]?.event_date).format('h:mm a'),
        people: bookingData[i].people_count,
        houseNumber: bookingData[i].address,
        street: bookingData[i].addressline2,
        postcode: bookingData[i].postcode,
        chef: chefObj?.dataValues?.user?.dataValues?.full_name,
        chefEmail: chefObj?.dataValues?.user?.dataValues?.email,
        menu: MenuObj?.dataValues?.name,
        cooker: CookerObj.name > 1 ? CookerObj.name + ' Hobs' : CookerObj.name + ' Hob',
        allergies: bookingData[i]?.allergies.map(item => item.dataValues.name.replace(',', ', ')),
        notes: bookingData[i].notes,
        price: priceObj.price,
        // total: (priceObj.price * bookingData[i].people_count) && (priceObj.price * bookingData[i].people_count).toFixed(2)
        total: bookingData[i].percent_off ? totalAmount - (totalAmount * (bookingData[i].percent_off / 100)) : totalAmount
      }
      chefReminderBookingEmail(emailData);
    }
  } catch (e) {
    console.log("Error: ", e);
  }
}

const getAllOutStandingBookings = async () => {
  try {
    let eventDate = new Date()
    let eventDate2 = new Date()
    eventDate.setHours(eventDate.getHours() - 24);
    eventDate2.setHours(eventDate.getHours() - 48);
    const bookingObject = await Booking.findAll({
      where: {
        [Op.and]: [
          {
            created_at: {
              [Op.lte]: eventDate,
            },
          },
          {
            created_at: {
              [Op.gte]: eventDate2,
            },
          },
        ],
      },
      include: [
        {
          model: View_Quote,
          where: {
            status: 'quote_initiate'
          }
        }
      ]
    });
    const uniqueChefArray = [...new Map(bookingObject.map(item =>
      [item['chef_id'], item])).values()];
    for (let i = 0; i < uniqueChefArray.length; i++) {
      let chefObj = await Chef.findOne({
        where: {
          id: uniqueChefArray[i].dataValues.chef_id,
        },
        include: [
          {
            model: User, attributes: ['full_name', 'email'], required: true,
          }
        ],
      });
      let chefEmail = chefObj?.dataValues?.user?.dataValues?.email
      outstandingBookingsEmail({ email: chefEmail })
    }
  } catch (e) {
    console.log("Error: ", e);
  }
}

export {
  getAllConfirmedBookings,
  getAllOutStandingBookings
}