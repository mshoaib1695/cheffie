import db from "../models"
const Log = db.logs;

const saveRequestDataToDatabase = (info) => {
    Log.create({...info})
}

export {
    saveRequestDataToDatabase
}