import express from 'express';
import fs from 'fs';
import { receiveNewMessage } from '../utils/email';
import path from 'path'
var sizeOf = require('image-size');

var router = express.Router();
const { Op } = require("sequelize");
var multer = require('multer');

import { isObject, objectIsEmpty } from "../utils"
import verifyToken from "../middlewares/verifyToken"
import dotenv from 'dotenv';
const jwt = require('jsonwebtoken');
dotenv.config();

import {
    Cuisine,
    Menu,
    MenuContents,
    ChefAreas,
    ChefAvailibility,
    role,
    Message,
    Chat,
    Image
} from '../models';

import db from "../models";

const User = db.user;
const Chef = db.chef;
const Customer = db.customer;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../tmp/chat-msgs-uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'chat-upload' + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage })

const saveFileIntoDb = (req, res, next) => {
    sizeOf(req.file.path, async function (err, dimensions) {
        try {
            const reps = await Image.create({
                name: req.file.filename,
                url: req.file.path,
                height: dimensions.height,
                width: dimensions.width,
                mimetype: req.file.mimetype,
                ext: path.extname(req.file.originalname)
            })
            res.locals.image = reps
            next()
        }
        catch (e) {
            res.status(500).json({ e });
        }
    })
}



router.get('/', async (req, res, next) => {
    try {
        const { query } = req;
        const resp = await Chat.findOrCreate({
            where: {
                [Op.and]: [
                    { customer_id: query.cus },
                    { chef_id: query.chef }
                ]
            },
            defaults: {
                customer_id: query.cus,
                chef_id: query.chef
            }
        })
        const chatResp = await Message.findAll({
            where: {
                chat_id: resp[0].id
            },
            attributes: [`id`, `chat_id`, `msg`, `isImg`, `receiver`, `sender`, `status`, `datetime`]
        })
        res.status(200).json({ chatId: resp[0].id, messages: chatResp });
    }
    catch (e) {
        res.status(500).json({ e });
    }
})
router.get('/chefchat', async (req, res, next) => {
  try {
      const { query } = req;
      const resp = await Chat.findOrCreate({
          where: {chef_id: query.chef},
          defaults: {chef_id: query.chef}
      })
      const chatResp = await Message.findAll({
          where: {
              chat_id: resp[0].id
          },
          attributes: [`id`, `chat_id`, `msg`, `isImg`, `receiver`, `sender`, `status`, `datetime`]
      })
      res.status(200).json({ chatId: resp[0].id, messages: chatResp });
  }
  catch (e) {
    console.log(e);
      res.status(500).json({ e });
  }
})

router.post('/file_upload', upload.single("file"), saveFileIntoDb, (req, res) => {
    try {
        var file = __dirname + "/" + req.file.originalname;
        fs.readFile(req.file.path, function (err, data) {
            fs.writeFile(file, data, async (err) => {
                let response = {}
                if (err) {
                    throw err
                }
                try {
                    const resp = await Message.create({
                        chat_id: req.body.chat_id,
                        msg: res.locals.image.dataValues.id,
                        isImg: req.body.isImg,
                        receiver: req.body.receiver,
                        sender: req.body.sender
                    })
                    res.status(200).json({ resp });
                }
                catch (e) {
                    res.status(500).json({ e });
                }
            });
        })
    }
    catch (e) {
        res.status(500).json({ e });
    }
})

const getUserEmail = async (ref_id, user_id, role_id) => {
  let userFound = '';
  if(role_id === 2){
    userFound = await Customer.findOne({
      where: { id: user_id },
      include: [
        { model: User, attributes: ['email'], required: true } 
      ],
    });
  }
  else {
    userFound = await Chef.findOne({
      where: { id: user_id },
      include: [
        { model: User, attributes: ['email'], required: true } 
      ]
    });
  }
  receiveNewMessage(ref_id, userFound.user.dataValues.email);
}
router.post('/msgs', async (req, res, next) => {
    const { params, body } = req;
    try {
      const resp = await Message.create({
          chat_id: body.chat_id,
          msg: body.msg,
          isImg: body.isImg,
          receiver: body.receiver,
          sender: body.sender
      })
      if(res.statusCode === 200) {
        getUserEmail(JSON.parse(body.ref_id), JSON.parse(body.receiver), body.role);
      }
      res.status(200).json({ resp });
    }
    catch (e) {
        res.status(500).json({ e });
    }
})
var options = {
    root: path.join(__dirname + '../../../')
};
router.get('/getimg/:id', async (req, res, next) => {
    const { params } = req;
    try {
        const resp = await Image.findOne({
            where: {
                id: params.id
            }
        })
        res.sendFile(path.join(__dirname + '../../../' + resp.dataValues.url), (err) => {
            if (err) {
                next(err);
            } else {
                next();
            }
        })
    }
    catch (e) {
        res.status(500).json({ e });
    }

})

export default router;


