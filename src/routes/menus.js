import express from 'express';
var router = express.Router();
import { isObject, objectIsEmpty } from '../utils';
import db, { ChefDocuments } from '../models';
const Booking = db.booking;
const sequelize = db.sequelize;
import moment from 'moment';

const { Op } = require('sequelize');

const Menu = db.menu;
const MenuContent = db.menuContent;
const Cuisine = db.cuisine;
const ChefsMenu = db.chefsMenu;
const Chef = db.chef;
const ChefAreas = db.chefAreas;
const ChefAvailibility = db.chefAvailibility;
const User = db.user;
const MenuBrContents = db.menuBrContents;
import https from 'https';

import dotenv from 'dotenv';
import { updateChefStatus } from '../utils/chef';
dotenv.config();

const getAnOutCode = (postcode) => {
  return new Promise((accept, reject) => {
    try {
      var options = {
        host: `api.postcodes.io`,
        port: 443,
        path: `/postcodes/${encodeURI(postcode)}`,
        method: 'GET',
      };
      const reqq = https.request(options, (ress) => {
        let data = '';
        ress.on('data', (d) => {
          data += d;
        });
        ress.on('end', async (d) => {
          if (JSON.parse(data).status == 200) {
            accept(JSON.parse(data).result.outcode);
          } else {
            accept(postcode.split(' ')[0]);
          }
        });
      });
      reqq.on('error', (error) => {
        reject(error);
      });
      reqq.end();
    } catch (e) {
      reject(error);
    }
  });
};
/* GET Menu by ID */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findOne({
      where: { id },
      include: [
        {
          model: MenuContent,
          through: {
            attributes: [],
          },
        },
        {
          model: Cuisine,
          as: 'cuisine',
        },
      ],
    });
    res.status(200).json(menu);
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
//  get menus by chef
router.get('/bychef/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findAll({
      where: {
        chefId: id,
        status: {
          [Op.not]: 'deleted',
        },
      },
      include: [{ model: MenuContent }],
    });
    res.status(200).json(menu);
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      max_persons,
      // starter,
      // mainCourse,
      // sideDish,
      // dessert,
      price,
      cuisine,
      menuItems,
      min_persons,
      type,
    } = req.body;

    let cuisineId = cuisine.id;

    const menu = await Menu.update(
      {
        name,
        max_persons,
        min_persons,
        menu_type: type,
        price,
        cuisineId,
        status: 'pending',
      },
      {
        where: { id: id },
        returning: true,
      }
    );

    let dbname = process.env.DB_NAME;

    for (let i = 0; i < menuItems.length; i++) {
      let menuItemType = menuItems[i].item_type;
      let menuItemDescription = menuItems[i].item_description;
      const [results] = await db.sequelize.query(
        `SELECT menu_content_id FROM ${dbname}.menu_br_contents where menu_content_id IN (SELECT id as menu_content_id FROM ${dbname}.menu_contents where title = '${menuItemType}') &&  menu_id = ${id};`
      );

      let menuContent;
      if (results.length) {
        menuContent = await MenuContent.update(
          {
            description: menuItemDescription,
          },
          {
            where: { id: results[0].menu_content_id },
            returning: true,
          }
        );
      } else {
        menuContent = await MenuContent.create({
          description: menuItemDescription,
          title: menuItemType,
        });
        let menuContentbr = await MenuBrContents.create({
          menu_content_id: menuContent.dataValues.id,
          menu_id: id,
        });
      }
    }

    // const [results] = await db.sequelize.query(
    //   `SELECT menu_content_id FROM ${dbname}.menu_br_contents where  menu_content_id IN (SELECT id as menu_content_id FROM  ${dbname}.menu_contents where title = 'Starters') &&  menu_id = ${id};`
    // );

    // const [results2] = await db.sequelize.query(
    //   ` SELECT menu_content_id FROM ${dbname}.menu_br_contents where  menu_content_id IN (SELECT id as menu_content_id FROM ${dbname}.menu_contents where title = 'Main Course') &&  menu_id = ${id};`
    // );

    // const [results3] = await db.sequelize.query(
    //   `SELECT menu_content_id FROM ${dbname}.menu_br_contents where  menu_content_id IN (SELECT id as menu_content_id FROM ${dbname}.menu_contents where title = 'Side Dishes') &&  menu_id = ${id};`
    // );

    // const [results4] = await db.sequelize.query(
    //   `SELECT menu_content_id FROM ${dbname}.menu_br_contents where menu_content_id IN (SELECT id as menu_content_id FROM ${dbname}.menu_contents where title = 'Dessert') &&  menu_id = ${id};`
    // );

    // let menuContent;
    // if (results.length) {
    //   menuContent = await MenuContent.update(
    //     {
    //       description: starter,
    //     },
    //     {
    //       where: { id: results[0].menu_content_id },
    //       returning: true,
    //     }
    //   );
    // } else {
    //   menuContent = await MenuContent.create({
    //     description: starter,
    //     title: 'Starters',
    //   });
    //   let menuContentbr = await MenuBrContents.create({
    //     menu_content_id: menuContent.dataValues.id,
    //     menu_id: id,
    //   });
    // }
    // let menuContent2;
    // if (results2.length) {
    //   menuContent2 = await MenuContent.update(
    //     {
    //       description: mainCourse,
    //     },
    //     {
    //       where: { id: results2[0].menu_content_id },
    //       returning: true,
    //     }
    //   );
    // } else {
    //   menuContent2 = await MenuContent.create({
    //     description: mainCourse,
    //     title: 'Main Course',
    //   });
    //   let menuContent2br = await MenuBrContents.create({
    //     menu_content_id: menuContent2.dataValues.id,
    //     menu_id: id,
    //   });
    // }
    // let menuContent3;
    // if (results3.length) {
    //   menuContent3 = await MenuContent.update(
    //     {
    //       description: sideDish,
    //     },
    //     {
    //       where: { id: results3[0].menu_content_id },
    //       returning: true,
    //     }
    //   );
    // } else {
    //   menuContent3 = await MenuContent.create({
    //     description: sideDish,
    //     title: 'Side Dishes',
    //   });
    //   let menuContent3br = await MenuBrContents.create({
    //     menu_content_id: menuContent3.dataValues.id,
    //     menu_id: id,
    //   });
    // }

    // let menuContent4;
    // if (results4.length) {
    //   menuContent4 = await MenuContent.update(
    //     {
    //       description: dessert,
    //     },
    //     {
    //       where: { id: results4[0].menu_content_id },
    //       returning: true,
    //     }
    //   );
    // } else {
    //   menuContent4 = await MenuContent.create({
    //     description: dessert,
    //     title: 'Dessert',
    //   });
    //   let menuContent4br = await MenuBrContents.create({
    //     menu_content_id: menuContent4.dataValues.id,
    //     menu_id: id,
    //   });
    // }
    const menudata = await Menu.findOne({
      where: { id: id },
    });
    updateChefStatus(menudata.dataValues.chefId);
    res
      .status(200)
      .json({ menu });
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      max_persons,
      min_persons,
      // starter,
      // mainCourse,
      // sideDish,
      // dessert,
      menuItems,
      price,
      cuisine,
      chefId,
      type,
    } = req.body;

    // cuisine update
    // let cuisineResp;
    // let isNewCuisine = false

    let cuisineResp = await Cuisine.findOne({
      where: { name: cuisine.name },
    });

    // if (cuisineResp2) {
    //   cuisineResp = cuisineResp2
    // } else {
    //   isNewCuisine = true
    //   cuisineResp = await Cuisine.create({
    //     name: cuisine.name
    //   })
    // }

    let cuisineId;
    // if (isNewCuisine) {
    //   cuisineId = cuisineResp.dataValues.id
    // } else {
    // }
    cuisineId = cuisineResp.dataValues.id;

    const count = await Menu.findAndCountAll({
      where: {
        chefId,
        menu_type: type,
        status: {
          [Op.not]: 'deleted',
        },
      },
      offset: 10,
      limit: 2,
    });

    if (count.count >= 4) {
      res.status(401).json({
        error: true,
        err: 'You can only upload maximum of four menus.',
      });
      return;
    }

    // console.log('menuItems:', menuItems);

    // return;
    // Menu update
    const menu = await Menu.create({
      name,
      max_persons,
      min_persons,
      menu_type: type,
      price,
      cuisineId,
      chefId,
      description: '',
      image: '/mobile/hummas.svg',
      rating: 0,
      reviews: 0,
    });

    let id = menu.dataValues.id;

    for (let i = 0; i < menuItems.length; i++) {
      let menuContent = await MenuContent.create({
        title: menuItems[i].item_type,
        description: menuItems[i].item_description,
      });
      const menuBrContent = await MenuBrContents.create({
        menu_id: id,
        menu_content_id: menuContent.dataValues.id,
      });
    }
    // const menuContentstarter = await MenuContent.create({
    //   title: 'Starters',
    //   description: starter,
    // });
    // const menuBrContentstarter = await MenuBrContents.create({
    //   menu_id: id,
    //   menu_content_id: menuContentstarter.dataValues.id
    // });

    // const menuContentmainCourse = await MenuContent.create({
    //   title: 'Main Course',
    //   description: mainCourse,
    // });
    // const menuBrContentmainCourse = await MenuBrContents.create({
    //   menu_id: id,
    //   menu_content_id: menuContentmainCourse.dataValues.id
    // });

    // const menuContentsideDish = await MenuContent.create({
    //   title: 'Side Dishes',
    //   description: sideDish,
    // });
    // const menuBrContentmainsideDish = await MenuBrContents.create({
    //   menu_id: id,
    //   menu_content_id: menuContentsideDish.dataValues.id
    // });

    // const menuContentdessert = await MenuContent.create({
    //   title: 'Dessert',
    //   description: dessert
    // });
    // const menuBrContentdessert = await MenuBrContents.create({
    //   menu_id: id,
    //   menu_content_id: menuContentdessert.dataValues.id
    // });

    updateChefStatus(chefId);
    res.status(200).json({ menu, cuisineResp });
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
router.get('/cuisines/getAllCuisines', async (req, res, next) => {
  try {
    const cuisines = await Cuisine.findAll({
      order: [['name', 'ASC']],
    });
    res.status(200).json(cuisines);
  } catch (e) {
    res.status(500).json({ e });
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { query } = req;

    let findQuery = {
      include: [{ model: User, attributes: ['full_name'] }],
    };

    if (isObject(query) && !objectIsEmpty(query)) {
      let bookedChef = [];
      let chefFromAllServiceAreas = [];
      if (query.eventDate) {
        let tempArr = [];
        const getBookedChefs = await Booking.findAll({
          where: {
            event_date: sequelize.where(
              sequelize.fn('date', sequelize.col('event_date')),
              '=',
              moment(new Date(query.eventDate)).format('YYYY-MM-DD')
            ),
            status: {
              [Op.ne]: 'canceled',
            },
          },
          attributes: ['chef_id'],
        });
        for (let i = 0; i < getBookedChefs.length; i++) {
          tempArr.push(getBookedChefs[i].dataValues.chef_id);
        }
        bookedChef = [...tempArr.filter((v, i, a) => a.indexOf(v) === i)];
      }
      if (query.postCode) {
        let tempArr = [];
        const getBookedChefs = await Chef.findAll({
          where: {
            all_service_areas: 1,
          },
          attributes: ['id'],
        });
        for (let i = 0; i < getBookedChefs.length; i++) {
          tempArr.push(getBookedChefs[i].dataValues.id);
        }
        chefFromAllServiceAreas = [
          ...tempArr.filter((v, i, a) => a.indexOf(v) === i),
        ];
      }
      const sortByQuery = query.sortby
        ? query.sortby == 'mostpopular'
          ? {
              order: [['reviews', 'DESC']],
            }
          : query.sortby == 'latest'
          ? {
              order: [['created_at', 'DESC']],
            }
          : {}
        : {};

      const limitQuery = query.top
        ? {
            limit: Number(query.top),
            order: [['rating', 'DESC']],
          }
        : {};
      const personsQuery = {
        where: {
          isActive: 'accepted',
          isLive: 1,
          isProfileApproved: 1,
          id: {
            [Op.notIn]: bookedChef,
          },
        },
      };
      let areasQuery = null;
      if (query.postCode) {
        const outcode = await getAnOutCode(query.postCode);
        areasQuery = query.postCode
          ? {
              model: ChefAreas,
              attributes: ['post_code', 'chef_id'],
              where: {
                [Op.or]: [
                  { post_code: outcode },
                  { chef_id: chefFromAllServiceAreas },
                ],
              },
            }
          : null;
      }
      const eventDate = new Date(query.eventDate);
      const eventTime = query.eventTime;
      const eventTimeElements = eventTime
        ? [
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
          ]
        : [];
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
                ...eventTimeElements,
              ],
            },
            attributes: [
              'starting_date',
              'ending_date',
              'starting_time',
              'ending_time',
            ],
          }
        : eventTime
        ? {
            model: ChefAvailibility,
            where: {
              [Op.and]: [...eventTimeElements],
            },
          }
        : null;

      findQuery = {
        ...limitQuery,
        ...sortByQuery,
        include: [
          ...findQuery.include,
          ...(availQuery ? [availQuery] : []),
          ...(areasQuery ? [areasQuery] : []),
        ],
        ...personsQuery,
      };
    }
    const chefs = await Chef.findAll(findQuery);

    let chefsIds = chefs.map((i) => i.dataValues.id);
    const filterByNoOfPeople = query.people
      ? {
          max_persons: {
            [Op.gte]: Number(query.people),
          },
        }
      : {};

    const filtersbyPrice = query.filtersbyPrice
      ? query.filtersbyPrice == 'under25'
        ? {
            where: {
              status: 'accepted',
              chefId: {
                [Op.in]: chefsIds,
              },
              price: {
                [Op.lte]: 25,
              },
              ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
            },
          }
        : query.filtersbyPrice == '2'
        ? {
            where: {
              status: 'accepted',
              chefId: {
                [Op.in]: chefsIds,
              },
              price: {
                [Op.between]: [25, 50],
              },
              ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
            },
          }
        : query.filtersbyPrice == '3'
        ? {
            where: {
              status: 'accepted',
              chefId: {
                [Op.in]: chefsIds,
              },
              price: {
                [Op.between]: [51, 100],
              },
              ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
            },
          }
        : query.filtersbyPrice == '4'
        ? {
            where: {
              status: 'accepted',
              chefId: {
                [Op.in]: chefsIds,
              },
              price: {
                [Op.gt]: 100,
              },
              ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
            },
          }
        : {
            where: {
              status: 'accepted',
              chefId: {
                [Op.in]: chefsIds,
              },
              ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
            },
          }
      : {
          where: {
            status: 'accepted',
            chefId: {
              [Op.in]: chefsIds,
            },
            ...(filterByNoOfPeople ? filterByNoOfPeople : {}),
          },
        };
    const priceAscORdesc =
      query.sortby == 'pricelowtohigh'
        ? { order: [['price', 'ASC']] }
        : query.sortby == 'pricehightolow'
        ? { order: [['price', 'DESC']] }
        : {};

    const limitQuery2 = query.top
      ? {
          limit: Number(query.top),
        }
      : {};
    const filtersByCuisine =
      query.filtersbyCuisine &&
      JSON.parse(query.filtersbyCuisine) &&
      JSON.parse(query.filtersbyCuisine).length
        ? {
            where: {
              name: {
                [Op.or]: JSON.parse(query.filtersbyCuisine),
              },
            },
          }
        : {};
    const menus = await Menu.findAll({
      ...limitQuery2,
      ...priceAscORdesc,
      ...filtersbyPrice,
      include: [
        {
          model: Cuisine,
          attributes: ['id', 'name'],
          as: 'cuisine',
          ...filtersByCuisine,
        },
      ],
    });
    res.status(200).json({ menus });
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});

router.post('/accept', async (req, res, next) => {
  try {
    const { id } = req.body;
    const menu = await Menu.update(
      {
        status: 'accepted',
      },
      {
        where: { id: id },
        returning: true,
      }
    );
    const menudata = await Menu.findOne({
      where: { id: id },
    });
    updateChefStatus(menudata.dataValues.chefId);
    res.status(200).json(menu);
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
router.post('/reject', async (req, res, next) => {
  try {
    const { id } = req.body;
    const menu = await Menu.update(
      {
        status: 'rejected',
      },
      {
        where: { id: id },
        returning: true,
      }
    );
    const menudata = await Menu.findOne({
      where: { id: id },
    });
    updateChefStatus(menudata.dataValues.chefId);
    res.status(200).json(menu);
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const menu = await Menu.update(
      {
        status: 'deleted',
      },
      {
        where: { id: id },
        returning: true,
      }
    );
    const menudata = await Menu.findOne({
      where: { id: id },
    });
    updateChefStatus(menudata.dataValues.chefId);
    res.status(200).json(menu);
  } catch (e) {
    console.log('e: ', e);
    res.status(500).json({ e });
  }
});

export default router;
