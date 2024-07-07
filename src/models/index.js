import dbConfig from "../config/db.config.js";

import Sequelize from "sequelize";
import AllergySchema from "./allergies.model.js"
import LogSchema from "./log.model.js"
import CookerSchema from "./cooker.model.js"
import UserSchema from "./user.model.js"
import MenuSchema from "./menu.model.js"
import BookingSchema from "./bookings.model"
import GeoCoordinatesSchema from "./geoCoordinates.model"
import ChefAreasSchema from "./chef_areas.model"
import ChefAvailibilitySchema from "./chef_availibilty.model"
import Payment from "./payment.model"
import Chatmessages from "./chatmessages.model"

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

export const ChefAreas = ChefAreasSchema(sequelize, Sequelize)
export const ChefAvailibility = ChefAvailibilitySchema(sequelize, Sequelize)
export const { User, Notifications, Customer, Chef, Role, PhoneNumber, ChefReq, ChefDocuments } = UserSchema(sequelize, Sequelize)
export const { Menu, MenuContents, Cuisine, ChefsMenu, MenuBrContents } = MenuSchema(sequelize, Sequelize)
export const { StripePaymentMethod, StripePayment, chefPaymentTransfers, chefPayments } = Payment(sequelize, Sequelize)
export const Cooker = CookerSchema(sequelize, Sequelize)
export const {Allergy, BookingAllergies } = AllergySchema(sequelize, Sequelize)
export const { Chat, Message, Image } = Chatmessages(sequelize, Sequelize)
export const { Booking, View_Quote, BookingLog } = BookingSchema(sequelize, Sequelize)

const db = {
    Sequelize,
    sequelize,
    allergy: Allergy,
    bookingAllergies: BookingAllergies,
    logs: LogSchema(sequelize, Sequelize),
    cooker: Cooker,
    customer: Customer,
    notifications: Notifications,
    chef: Chef,
    chefAreas: ChefAreas,
    chefAvailibility: ChefAvailibility,
    role: Role,
    user: User,
    phoneNumber: PhoneNumber,
    chefReq: ChefReq,
    menu: Menu,
    cuisine: Cuisine,
    menuContent: MenuContents,
    booking: Booking,
    view_quote: View_Quote,
    chat: Chat,
    chefsMenu:ChefsMenu,
    chefDocuments: ChefDocuments,
    menuBrContents:MenuBrContents,
    message: Message,
    bookingLog: BookingLog,
    geoCoordinates: GeoCoordinatesSchema(sequelize, Sequelize)
};

export default db;