import { ChefsMenu, Menu, Chef } from '../models/index'

export const createMenu = async (id) => {
    try {
        const menufind = await Menu.findOne({
            where: {
                id: id
            }
        })
        const menuchef = await ChefsMenu.create({
            chefId: menufind.dataValues.chefId,
            menuId: id
        })

        let minm = await Menu.min('price', { where: { chefId: menufind.dataValues.chefId, status: 'accepted' } });
        let chef = Chef.update({
            starting_rate: minm
        }, {
            where: {
                id: menufind.dataValues.chefId
            }
        })
        // let cehfupdate = Chef.update({starting_rate: min}) 
    }
    catch (e) {
        console.log(e)
    }
}

export const updateMenu = async (payload, id) => {
    let newid = id
    try {
        const menufind = await Menu.findOne({
            where: {
                id: newid
            }
        })
        if (payload.status && menufind.dataValues.chefId) {
            const menuchef = await ChefsMenu.update({
                status: payload.status
            }, {
                where: {
                    chefId: menufind.dataValues.chefId,
                    menuId: newid
                }
            });
        }
        let minm = await Menu.min('price', { where: { chefId: menufind.dataValues.chefId, status: 'accepted' } });
        let minp = await Menu.min('max_persons', { where: { chefId: menufind.dataValues.chefId, status: 'accepted' } });
        let chef = Chef.update({
            starting_rate: minm,
            max_persons: minp
        }, {
            where: {
                id: menufind.dataValues.chefId
            }
        })
    }
    catch (e) {
        console.log(e)
    }
}

