import { Chef } from "./index"
import { createMenu, updateMenu } from '../utils/menu'

const MenuSchema = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { STRING, INTEGER } = DataTypes
    const Menu = sequelize.define("menu", {
        name: {
            type: STRING
        },
        max_persons: {
            type: INTEGER
        },
        description: {
            type: STRING
        },
        image: {
            type: STRING
        },
        rating: {
            type: INTEGER
        },
        reviews: {
            type: INTEGER
        },
        price: {
            type: INTEGER
        },
        cuisineId: {
            type: INTEGER
        },
        chefId: {
            type: INTEGER
        },
        status: {
            type: STRING
        },
        min_persons: {
            type: INTEGER
        },
        menu_type: {
            type: STRING
        },
    }, {
        hooks: {
            afterCreate: (payload) => {
                createMenu(payload.dataValues.id)
            },
            afterValidate: (payload, options) => {
                if(options && options.where && options.where.id){
                    updateMenu(payload.dataValues, options.where.id)
                }
            }
        }
    });

    const Cuisine = sequelize.define("cuisines", {
        name: {
            type: STRING
        },
    }, {
        timestamps: false,
    })

    const MenuContents = sequelize.define("menu_contents", {
        title: {
            type: STRING
        },
        description: {
            type: STRING
        },

    }, {
        timestamps: false,
        underscored: true
    });

    const MenuBrContents = sequelize.define("menu_br_contents", {
        menu_id: {
            type: INTEGER,
            primaryKey: true,
        },
        menu_content_id: {
            type: INTEGER,
            primaryKey: true,
        }
    }, {
        timestamps: false,
        underscored: true
    });
    const ChefsMenu = sequelize.define("chefmenus", {
        chefId: {
            type: INTEGER,
            primaryKey: true,
        },
        menuId: {
            type: INTEGER,
            primaryKey: true,
        },
        status: {
            type: STRING
        }
    });
    // Menu.addHook('afterCreate', async (payload, options) => {
    //     createMenu(payload.dataValues.id)
    // });

    Menu.belongsTo(Cuisine, { as: 'cuisine' })
    //   Menu.belongsTo(Chef)
    Menu.belongsToMany(MenuContents, { through: 'menu_br_contents' });
    //   ChefsMenu.belongsTo(Chef)
    Chef.belongsToMany(Menu, { through: 'chefmenus', as: 'ppp' });

    return { Menu, MenuContents, MenuBrContents, MenuBrContents, Cuisine, ChefsMenu };

}

export default MenuSchema