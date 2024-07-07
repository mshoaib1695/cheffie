import express from 'express';
var router = express.Router();
const { Op } = require("sequelize");
import db, { Cuisine, Menu, MenuContents } from '../models';
const Allergy = db.allergy;
const Chefs = db.chef;
const ChefAreas = db.chefAreas;
const Cooker = db.cooker;
const jwt = require('jsonwebtoken');
import https from 'https'
import verifyToken from "../middlewares/verifyToken"

import dotenv from 'dotenv';
dotenv.config();

/* GET Chefs with search queryparams */
router.get('/', async (req, res, next) => {
  try {
    const resp = await Allergy.findAll()
    res.status(200).json({ ...resp });
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
router.get('/cookers', async (req, res, next) => {
  try {
    const resp = await Cooker.findAll({
      attributes: ['id', 'name']
    })
    res.status(200).json({ ...resp });
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
router.get('/postcodes/verify', async (req, res, next) => {
  try {
    var options = {
      host: `api.postcodes.io`,
      port: 443,
      path: `/postcodes/${encodeURI(req.query.postcode)}/validate`,
      method: 'GET'
    };
    const reqq = https.request(options, ress => {
      ress.on('data', d => {
        res.status(200).json(JSON.parse(d.toString('utf8')));
      })
    })

    reqq.on('error', error => {
      res.status(500).json({ error });
      console.error(error)
    })

    reqq.end()
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
const getAnOutCode = (postcode) => {
  return new Promise((accept, reject) => {
    try {
      var options = {
        host: `api.postcodes.io`,
        port: 443,
        path: `/postcodes/${encodeURI(postcode)}`,
        method: 'GET'
      };
      const reqq = https.request(options, ress => {
        let data = ''
        ress.on('data', d => {
          data += d;
        })
        ress.on('end', async d => {
          // console.log(data)
          accept(JSON.parse(data))
        })
      })
      reqq.on('error', error => {
        reject(error)
        console.log(error)
      })
      reqq.end()
    }
    catch (e) {
      console.log(error)

      reject(error)
    }
  })
}
router.get('/postcodes/verify/validate', async (req, res, next) => {
  try {
    var options = {
      host: `api.postcodes.io`,
      port: 443,
      path: `/postcodes/${encodeURI(req.query.postcode)}/validate`,
      method: 'GET'
    };
    const reqq = https.request(options, ress => {
      ress.on('data', async d => {
        if (JSON.parse(d.toString('utf8')).result) {

          const outcode = await getAnOutCode(req.query.postcode)
          
          const chefArea = await Chefs.findOne({ where: { id: req.query.id }, raw: true})
          if(chefArea?.all_service_areas){
            res.status(200).json({ status: 200, result: true, message: '' })
            return
          }

          const chefsreq = await Chefs.count({
            where: {
              id: req.query.id
            },
            include: [{
              model: ChefAreas,
              attributes: ["post_code"],
              where: {
                 chef_id: [req.query.id] ,
                [Op.or]: [{ post_code: outcode.result.outcode }]

              }
            }
            ]
          })
          console.log("AREA: ", chefsreq);
          if (chefsreq) {
            res.status(200).json({ status: 200, result: true, message: '' })
          } else {
            res.status(200).json({ status: 200, result: false, message: 'The chef is not available in your area. ' })
          }
        } else {
          res.status(200).json({ ...JSON.parse(d.toString('utf8')), message: 'Your post code not found.' });
        }
      })
    })

    reqq.on('error', error => {
      res.status(500).json({ error });
      console.error(error)
    })

    reqq.end()
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
router.get('/outcode/verify', async (req, res, next) => {
  try {
    var options = {
      host: `api.postcodes.io`,
      port: 443,
      path: `/outcodes/${req.query.postcode}`,
      method: 'GET'
    };
    const reqq = https.request(options, ress => {
      ress.on('data', d => {
        res.status(200).json(JSON.parse(d.toString('utf8')));
      })
    })

    reqq.on('error', error => {
      res.status(500).json({ error });
      console.error(error)
    })

    reqq.end()
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
export default router;