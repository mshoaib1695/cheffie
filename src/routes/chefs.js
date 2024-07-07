import express from 'express';
import AWS from 'aws-sdk'
import multer from 'multer'
import moment from 'moment'
var router = express.Router();
const { Op } = require("sequelize");
import db, { Cuisine, Menu, MenuContents, PhoneNumber, } from '../models';
const Chef = db.chef;
const sequelize = db.sequelize;
const Booking = db.booking;
const ChefAreas = db.chefAreas;
const ChefsMenu = db.chefsMenu;
const ChefDocuments = db.chefDocuments;
const ChefAvailibility = db.chefAvailibility;
const User = db.user;
import { isObject, objectIsEmpty } from "../utils"
const jwt = require('jsonwebtoken');
import verifyToken from "../middlewares/verifyToken"
import { json } from './postcodes.js'
import dotenv from 'dotenv';
import { onboaring } from '../utils/email'
import https from 'https'
import { updateChefStatus } from '../utils/chef';
import { chefAccountLive, chefAccountHold, chefAccounCreateEmail } from '../utils/email';
import { transferToChef, transferToChefAfterBooking } from '../services/paymentSchedular'

dotenv.config();

/* GET Chefs with search queryparams */
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
          if (JSON.parse(data).status == 200) {
            accept(JSON.parse(data).result.outcode)
          } else {
            accept(postcode.split(' ')[0])
          }
        })
      })
      reqq.on('error', error => {
        reject(error)
      })
      reqq.end()
    }
    catch (e) {
      reject(error)
    }
  })
}
router.get('/', async (req, res, next) => {
  try {
    const { query } = req;

    let findQuery = {
      include: [
        { model: User, attributes: ['full_name'] }
      ],
    }
    if (isObject(query) && !objectIsEmpty(query)) {
      const cuisineWhereClause = (query.filtersbyCuisine &&
        JSON.parse(query.filtersbyCuisine) &&
        JSON.parse(query.filtersbyCuisine).length) ? {
        where: {
          name: {
            [Op.or]: JSON.parse(query.filtersbyCuisine)
          }
        }
      } : {}
      // SELECT chef_id as id FROM chf_dev.bookings where DATE( event_date ) = '2022-02-12' && status != "canceled"
      let bookedChef = []
      if (query.eventDate) {
        let tempArr = []
        const getBookedChefs = await Booking.findAll({
          where: {
            event_date: sequelize.where(sequelize.fn('date', sequelize.col('event_date')), '=', moment(new Date(query.eventDate)).format("YYYY-MM-DD")),
            status: {
              [Op.ne]: 'canceled'
            }
          },
          attributes: ['chef_id']
        })
        for (let i = 0; i < getBookedChefs.length; i++) {
          tempArr.push(getBookedChefs[i].dataValues.chef_id)
        }
        bookedChef = [...tempArr.filter((v, i, a) => a.indexOf(v) === i)]
      }
      let chefFromAllServiceAreas = []
      if (query.postCode) {
        let tempArr = []
        const getBookedChefs = await Chef.findAll({
          where: {
            all_service_areas: 1
          },
          attributes: ['id']
        })
        for (let i = 0; i < getBookedChefs.length; i++) {
          tempArr.push(getBookedChefs[i].dataValues.id)
        }
        chefFromAllServiceAreas = [...tempArr.filter((v, i, a) => a.indexOf(v) === i)]
      }
      const filtersByCuisine = (query.filtersbyCuisine &&
        JSON.parse(query.filtersbyCuisine) &&
        JSON.parse(query.filtersbyCuisine).length) ? {
        model: Cuisine,
        attributes: ['name'],
        as: 'cuisine',
        ...cuisineWhereClause
      } : null

      const filtersbyPrice = query.filtersbyPrice ?
        query.filtersbyPrice == 'under25' ? {
          model: Menu,
          as: 'ppp',
          where: {
            price: {
              [Op.lte]: 25
            },
            status: {
              [Op.ne]: 'deleted'
            },
          },
          include: [
            ...(filtersByCuisine ? [filtersByCuisine] : []),
          ]
        } :
          query.filtersbyPrice == '2' ? {
            model: Menu,
            as: 'ppp',
            where: {
              price: {
                [Op.between]: [25, 50],
              },
              status: {
                [Op.ne]: 'deleted'
              },
            },
            include: [
              ...(filtersByCuisine ? [filtersByCuisine] : []),
            ]
          } :
            query.filtersbyPrice == '3' ? {
              model: Menu,
              as: 'ppp',
              where: {
                price: {
                  [Op.between]: [51, 100],
                },
                status: {
                  [Op.ne]: 'deleted'
                },
              },
              include: [
                ...(filtersByCuisine ? [filtersByCuisine] : []),
              ]
            } :
              query.filtersbyPrice == '4' ? {
                model: Menu,
                as: 'ppp',
                where: {
                  price: {
                    [Op.gt]: 100
                  },
                  status: {
                    [Op.ne]: 'deleted'
                  },
                },
                include: [
                  ...(filtersByCuisine ? [filtersByCuisine] : []),
                ]

              }
                : null : null
      const sortByQuery = query.sortby ?
        query.sortby == 'mostpopular' ?
          {
            order: [['reviews', 'DESC']]
          } :
          query.sortby == 'latest' ? {
            order: [['created_at', 'DESC']]
          } : {}
        : {}
      const priceLowHighQuery = query.sortby ? query.sortby == 'pricehightolow' ? {
        model: Menu,
        as: 'ppp'
      } :
        query.sortby == 'pricelowtohigh' ? {
          model: Menu,
          as: 'ppp'
        } : null : null
      const priceAscORdesc = query.sortby == 'pricelowtohigh' ? "ASC" : "DESC"
      const limitQuery = query.top ? {
        limit: Number(query.top),
        order: [['rating', 'DESC']]
      } : priceLowHighQuery ?
        {
          order: [
            [{ model: Menu, as: 'ppp' }, 'price', priceAscORdesc]]
        } : {}
      { }
      const personsQuery = query.people ? {
        where: {
          max_persons: {
            [Op.gte]: query.people
          },
          isActive: 'accepted',
          isLive: 1,
          isProfileApproved: 1,
          id: {
            [Op.notIn]: bookedChef
          },
        }
      } : {
        where: {
          isActive: 'accepted',
          isLive: 1,
          isProfileApproved: 1,
          id: {
            [Op.notIn]: bookedChef
          },
        }
      };
      let areasQuery = null
      if (query.postCode) {
        const outcode = await getAnOutCode(query.postCode)
        areasQuery = query.postCode ? {
          model: ChefAreas,
          attributes: ["post_code", 'chef_id'],
          where: {
            [Op.or]: [{ post_code: outcode }, { chef_id: chefFromAllServiceAreas }]
          }
        } : null;
      }
      const eventDate = new Date(query.eventDate)
      const eventTime = query.eventTime;
      const eventTimeElements = eventTime ? [
        {
          starting_time: {
            [Op.lte]: eventTime,
          },
        },
        {
          ending_time: {
            [Op.gte]: eventTime,
          },
        },
      ] : []

      const availQuery = query.eventDate
        ? {
          model: ChefAvailibility,
          where: {
            [Op.and]: [
              {
                starting_date: {
                  [Op.lte]: eventDate,
                },
              },
              {
                ending_date: {
                  [Op.gte]: eventDate,
                },
              },
              ...eventTimeElements
            ],
          },
          attributes: [
            'starting_date',
            'ending_date',
            'starting_time',
            'ending_time',
          ],
        }
        : eventTime ? {
          model: ChefAvailibility,
          where: {
            [Op.and]: [
              ...eventTimeElements
            ],
          }
        } : null;
      findQuery = {
        ...limitQuery,
        ...sortByQuery,
        // ...cuisineWhereClause,
        include: [
          ...findQuery.include,
          ...(availQuery ? [availQuery] : []),
          ...(areasQuery ? [areasQuery] : []),
          ...(priceLowHighQuery ? [priceLowHighQuery] : []),
          ...(filtersbyPrice ? [filtersbyPrice] :
            filtersByCuisine ? [{
              model: Menu,
              as: 'ppp',
              where: {
                price: {
                  [Op.gt]: 0
                }
              },
              include: [
                ...([filtersByCuisine]),
              ]
            }] : []
          ),
        ],
        ...personsQuery,
      }

    }
    const chefs = await Chef.findAll(findQuery);
    res.status(200).json({ chefs, query });
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
router.get('/:id', async (req, res, next) => {
  try {
    const { params, query } = req;
    const { id } = params;
    const chefInclude = []
    if (query && query.details === "true") {
      chefInclude.push(
        { model: ChefAreas },
        { model: ChefAvailibility }
      )
    }
    const menusObject = await Menu.findAll({
      where: {
        status: 'accepted',
        chefId: Number(id)
      },
      include: [
        { model: Cuisine, as: 'cuisine' },
        { model: MenuContents }
      ],
    })
    const menus = JSON.parse(JSON.stringify(menusObject))
    const chefObject = await Chef.findOne({
      include: [
        ...chefInclude,
        {
          model: User, attributes: ['full_name', 'email'], required: true,
          include: [
            { model: PhoneNumber },
          ]
        },
      ],
      where: {
        id: id
      },
    })
    const chef = JSON.parse(JSON.stringify(chefObject))
    if (chef != null) {
      res.status(200).json({ data: { ...chef, menus }, success: true });
    } else {
      res.status(200).json({ data: {}, success: false });
    }
  }
  catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
})
router.put('/onboarding/completed/:id', verifyToken, async (req, res, next) => {
  const { params } = req;
  const { id } = params;
  try {
    const query = await Chef.update({ on_board: true }, {
      where: {
        id: id
      }
    })

    const chef = await Chef.findOne({
      where: {
        id: id
      },
      include: [
        { model: User, attributes: ['full_name', 'email'], required: true, }
      ]
    })
    chefAccounCreateEmail(chef.dataValues.user.dataValues.email);
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})
/* PUT Chef */
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const user = await Chef.findOne({
      where: {
        id: Number(id)
      },
      attributes: ["user_id"]
    })
    if (decoded && decoded.user_role == 2 && decoded.user_id === user.user_id) {
      const chf = await Chef.update(body, {
        where: {
          id: Number(id)
        },
        returning: true
      });

      const updatedChef = await Chef.findOne({
        where: {
          id: Number(id)
        }
      })
      res.status(200).json({ chef: updatedChef });
    } else {
      throw "Unauthorized User"
    }
  }
  catch (e) {
    console.log("e: ", e)
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})

//  get chef availabilities
router.get('/availabilities/:id', async (req, res, next) => {
  const { params } = req;
  const { id } = params;
  try {
    const query = await ChefAvailibility.findAll({
      where: {
        chef_id: id
      }
    })
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})
router.post('/availabilities', async (req, res, next) => {
  const { body } = req;
  const { starting_date, ending_date, starting_time, ending_time, chef_id } = body;
  try {
    const query = await ChefAvailibility.create({
      starting_date, ending_date, starting_time, ending_time, chef_id, status: 'accepted'
    })
    updateChefStatus(chef_id)
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})
router.put('/availabilities/:id', async (req, res, next) => {
  const { body, params } = req;
  const { id } = params;
  const { starting_date, ending_date, starting_time, ending_time, chef_id } = body;
  try {
    const query = await ChefAvailibility.update({
      starting_date, ending_date, starting_time, ending_time, chef_id
    },
      {
        where: {
          id: id
        }
      })
    updateChefStatus(chef_id)
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})
router.delete('/availabilities/:id', async (req, res, next) => {
  const { params } = req;
  const { id } = params;
  try {
    const query = await ChefAvailibility.destroy({
      where: {
        id: id
      }
    })
    // updateChefStatus(chef_id)
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})
router.delete('/areas/:id', async (req, res, next) => {
  const { params } = req;
  const { id } = params;
  try {
    const query = await ChefAreas.destroy({
      where: {
        id: id
      }
    })
    // updateChefStatus(chef_id)
    res.status(200).json({ ...query });
  }
  catch (e) {
    res.status(500).json({ e });
  }
})

const postcodeArrayGenerateAPI = (inc) => {
  return new Promise(async (resolve, reject) => {
    let addrss = json[inc].A
    if (json[inc].B) {
      addrss = json[inc].B + ',' + addrss
    }
    try {
      var options = {
        host: `maps.googleapis.com`,
        port: 443,
        path: `/maps/api/geocode/json?address=${encodeURI(addrss)}&sensor=false&key=${process.env.REACT_APP_GOOGLE_MAPS_KEY}`,
        method: 'POST'
      };
      const reqq = https.request(options, ress => {
        let data = ''
        ress.on('data', d => {
          data += d;
        })
        ress.on('end', d => {
          let postcode = JSON.parse(data)
          let location
          if (postcode && postcode.results && postcode.results[0] && postcode.results[0].geometry) {
            location = postcode.results[0].geometry.location
            resolve({
              name: json[inc].B,
              lat: location.lat,
              lng: location.lng
            })
          }
        })
      })
      reqq.on('error', error => {
        console.error(error)
      })

      reqq.end()
    }
    catch (e) {
      console.log('e: ', e);
    }

  })
}
const postcodeArrayGenerate = () => {
  return new Promise(async (resolve, reject) => {
    let arr = []
    for (let inc = 0; inc < json.length; inc++) {
      let aa = await postcodeArrayGenerateAPI(inc)
      console.log('data', aa)
      arr.push(aa)
    }
    resolve(arr)
  })
}
router.post('/postcode', async (req, res, next) => {
  postcodeArrayGenerate()
    .then(ressp => {
      res.send(ressp)
    })
})

// 
router.get('/service-areas-by-chef/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const areas = await ChefAreas.findAll({
      where: {
        chef_id: Number(id),
        status: {
          [Op.ne]: ['default']
        }
      },
    })
    res.status(200).json({ areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})
router.post('/create-service-areas-chef/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const areas = await ChefAreas.create({
      chefId: id,
      post_code: body.post_code,
      status: 'accepted'
    })
    updateChefStatus(id)
    res.status(200).json({ areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})
router.put('/update-service-areas-chef/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const areas = await ChefAreas.update({
      post_code: body.post_code,
    }, {
      where: {
        chefId: id,
        id: body.id
      }
    })
    updateChefStatus(id)
    res.status(200).json({ areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})
router.put('/update-status/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const areas = await ChefAreas.update({
      status: body.status,
    }, {
      where: {
        chefId: id,
        status: {
          [Op.ne]: ['default']
        }
      }
    })
    const chefReq = await Chef.update({
      is_all_service_areas: body.status
    }, {
      where: {
        id: id,
      },
    })
    updateChefStatus(id)

    res.status(200).json({ areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})

// All Service Areas
router.get('/all-service-areas-by-chef/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const chefs_all_areas = await Chef.findAll({
      where: {
        id: Number(id),
        // status: {
        //   [Op.ne]: ['default']
        // }
      },
    })
    res.status(200).json({ chefs_all_areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})
router.put('/update-all-uk-status/:id', verifyToken, async (req, res, next) => {
  try {
    const { token, body, params } = req;
    const decoded = jwt.verify(token, process.env.AUTH_PASS_PHRASE);
    const { id } = params;
    const areas = await Chef.update({
      is_all_service_areas: body.status,
    }, {
      where: {
        id: id,
      }
    })
    updateChefStatus(id)

    res.status(200).json({ areas })
  }
  catch (e) {
    let msg = e;
    if (e.response) {
      msg = e.response;
    }
    res.status(e.response ? 500 : 401).json({
      msg
    })
  }
})


const storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, '')
  }
})

const upload = multer({ storage }).single('file')

const getDocumentIfAlreadyUploaded = (chefid, document_type) => {
  return new Promise(async (accept, reject) => {
    try {
      const ChefDocumentsApi = await ChefDocuments.findOne({
        where: {
          chef_id: chefid,
          document_type: document_type
        }
      })
      accept({ ChefDocumentsApi })
    } catch (e) {
      reject(e)
    }
  })
}
const uploaddocs = (chefid, document_type, fileType, bufferfile, name) => {
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId: process.env.accessKeyId,
      secretAccessKey: process.env.secretAccessKey
    },
  });
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME + '/' + chefid,
    Key: `${name}.${fileType}`,
    Body: bufferfile
  }
  return new Promise(async (accept, reject) => {
    try {
      s3.upload(params, async (error, data) => {
        if (error) {
          reject(error)
          return
        }
        const ChefDocumentsApi = await ChefDocuments.create({
          chef_id: chefid,
          key: data.key,
          document_type: document_type
        })
        accept({ ChefDocumentsApi })
      })
    }
    catch (e) {
      reject(e)
    }
  })
}
const uploadimage = (chefid, document_type, fileType, bufferfile) => {
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId: process.env.accessKeyId,
      secretAccessKey: process.env.secretAccessKey
    },
  });
  const params = {
    Bucket: process.env.AWS_BUCKET_IMAGE + '/' + chefid,
    Key: `${Math.floor(Date.now() / 1000).toString(18)}.${fileType}`,
    Body: bufferfile
  }
  return new Promise(async (accept, reject) => {
    try {
      s3.upload(params, async (error, data) => {
        if (error) {
          reject(error)
          return
        }
        const ChefDocumentsApi = await Chef.update({
          image: data.Location
        }, {
          where: {
            id: chefid,
          }
        })
        accept(data.Location)
      })
    }
    catch (e) {
      reject(e)
    }
  })
}
const updatedocs = (chefid, document_type, fileType, bufferfile, id, name) => {
  const s3 = new AWS.S3({
    credentials: {
      accessKeyId: process.env.accessKeyId,
      secretAccessKey: process.env.secretAccessKey
    },
  });
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME + '/' + chefid,
    Key: `${name}.${fileType}`,
    Body: bufferfile
  }

  return new Promise(async (accept, reject) => {
    try {
      s3.upload(params, async (error, data) => {
        if (error) {
          reject(error)
          return
        }
        let status = "pending", key = data.Key
        const ChefDocumentsApi = await
          ChefDocuments.update(
            { status, key },
            {
              where: { id }
            })
        accept({ ChefDocumentsApi })
      })
    }
    catch (e) {
      reject(e)
    }
  })
}
router.post('/uploaddocs', upload, async (req, res, next) => {
  let myFile = req.file.originalname.split(".")
  let userfilename = myFile[myFile.length - 2]
  const fileType = myFile[myFile.length - 1]
  let chefid = req.body.chefid
  let document_type = req.body.document_type
  getDocumentIfAlreadyUploaded(chefid, document_type)
    .then(async ress => {
      if (ress.ChefDocumentsApi) {
        try {
          const uploadtrigger = await updatedocs(chefid, document_type, fileType, req.file.buffer, ress.ChefDocumentsApi.id, userfilename)
          updateChefStatus(chefid)
          res.status(200).json({ uploadtrigger })
        }
        catch (e) {
          res.status(500).json({ e })
        }
      } else {
        try {
          const uploadtrigger = await uploaddocs(chefid, document_type, fileType, req.file.buffer, userfilename)
          res.status(200).json({ uploadtrigger })
        }
        catch (e) {
          res.status(500).json({ e })
        }
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({ err })
    })
})
router.post('/upload/chefprofileimage', upload, async (req, res, next) => {
  let myFile = req.file.originalname.split(".")
  const fileType = myFile[myFile.length - 1]
  let chefid = req.body.chefid
  let document_type = req.body.document_type
  try {
    const uploadtrigger = await uploadimage(chefid, document_type, fileType, req.file.buffer)
    res.status(200).json(uploadtrigger)
  }
  catch (e) {
    res.status(500).json({ e })
  }
})
router.get('/docs/getallchefdocs/:chefId', verifyToken, async (req, res) => {
  const { chefId } = req.params
  try {
    const req = await ChefDocuments.findAll({
      where: {
        chef_id: chefId,
        // document_type: {
        //   [Op.ne]: ['profileImage']
        // }
      }
    })
    res.status(200).json([...req])
  }
  catch (e) {
    console.log(e)
    res.status(401).send(e)
  }
})
router.post('/docs/updatestatus', verifyToken, async (req, res) => {
  const { status, id } = req.body
  try {
    const req = await ChefDocuments.update({
      status
    }, {
      where: {
        id
      }
    })
    const chefId = await ChefDocuments.findOne({
      attributes: ['chef_id'],
      where: {
        id
      }
    })
    updateChefStatus(chefId.dataValues.chef_id)
    // const countchefdocs = await ChefDocuments.count({
    //   where: {
    //     status: 'accepted',
    //     chef_id: chefId.dataValues.chef_id
    //   }
    // })

    // if (countchefdocs > 0) {
    //   const ChefUpdate = await Chef.update({
    //     isActive: 'accepted',
    //   }, {
    //     where: {
    //       id: chefId.dataValues.chef_id
    //     }
    //   })

    // }
    res.status(200).json([...req])
  }
  catch (e) {
    console.log(e)
    res.status(401).send(e)
  }
})
router.post('/getdocs', async (req, res, next) => {
  const { fileName } = req.body;
  const S3_BUCKET = 'cheffiefiles';
  const REGION = process.env.region;
  const URL_EXPIRATION_TIME = 36000; // in seconds
  const myBucket = new AWS.S3({
    signatureVersion: 'v4',
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    Bucket: S3_BUCKET,
    region: REGION
  })
  try {
    myBucket.getSignedUrl('getObject', {
      Key: fileName,
      Bucket: S3_BUCKET,
      Expires: URL_EXPIRATION_TIME
    }, (err, url) => {
      if (err) {
        res.send(err)
      }
      res.send(url)
    });
  }
  catch (e) {
    res.send(e)
  }
})

router.get('/getbooked/dates/bychef/:chefId', verifyToken, async (req, res, next) => {
  const { chefId } = req.params;

  try {
    const chefDetails = await Booking.findAll({
      attributes: ['event_date'],
      where: {
        chef_id: chefId,
        status: {
          [Op.ne]: 'cacnceled'
        },
        payment_id: {
          [Op.ne]: 'null'
        },
        event_date: {
          [Op.gte]: moment().toDate()
        },
      }
    })
    let tempArr = []

    for (let i = 0; i < chefDetails.length; i++) {
      tempArr.push(chefDetails[i].dataValues.event_date)
    }
    res.status(200).json(tempArr)
  }
  catch (e) {
    res.status(400).json(e)
  }
})
router.post('/activate/chef', verifyToken, async (req, res, next) => {
  let accountStatus = req.body.status ? 1 : 0;
  try {
    const chefUpdateStatus = await Chef.update({
      isLive: req.body.status ? 1 : 0
    },
      {
        where: {
          id: req.body.chef_id,
        }
      })
    const userFound = await Chef.findOne({
      where: { id: req.body.chef_id },
      include: [
        { model: User, attributes: ['email'], required: true }
      ],
    });
    if (accountStatus === 1) {
      chefAccountLive(userFound.user.dataValues.email);
    }
    else {
      chefAccountHold(userFound.user.dataValues.email);
    }
    res.status(200).json({ ...chefUpdateStatus })
  }
  catch (e) {
    console.log(e);
    res.status(400).json(e)
  }
})
router.get('/ischef/selectedforall/service-areas/:id', async (req, res) => {
  try {
    const chefReq = await Chef.findOne({
      where: {
        id: req.params.id,
      },
      attributes: ['all_service_areas']
    })
    res.status(200).json(chefReq)
  }
  catch (e) {
    res.status(400).json(e)
  }
})
router.put('/ischef/selectedforall/service-areas/:id', async (req, res) => {
  try {
    const chefReq = await Chef.update({
      all_service_areas: req.body.value,
      is_all_service_areas: req.body.value ? 'accepted' : 'rejected'
    }, {
      where: {
        id: req.params.id,
      },
      attributes: ['all_service_areas']
    })
    res.status(200).json(chefReq)
  }
  catch (e) {
    res.status(400).json(e)
  }
})
router.put('/allserviceareas/:id', async (req, res) => {
  try {
    const allAreas = await Chef.update({
      all_service_areas: req.body.areas_value,
      is_all_service_areas: req.body.areas_status
    },
      {
        where: {
          id: req.params.id
        },
        attributes: ['all_service_areas', 'is_all_service_areas']
      })
    updateChefStatus(req.params.id)
    res.status(200).json(allAreas)
  }
  catch (e) {
    res.status(400).json(e)
  }
})
router.delete('/removeserviceareas/:id', async (req, res) => {
  try {
    const chefAreas = await ChefAreas.destroy({
      where: {
        chef_id: req.params.id,
        status: {
          [Op.ne]: ['default']
        }
      }
    })
    res.status(200).json({ chefAreas })
  }
  catch (e) {
    console.log("ERROR: ", e);
    res.status(400).json(e)
  }
})
router.post('/run/cron', verifyToken, async (req, res) => {
  try {
    await transferToChefAfterBooking()
    await transferToChef()
    res.status(200).json({ success: true })
  }
  catch (e) {
    res.status(400).json({ success: false })
    console.log(e)
  }
})

export default router;