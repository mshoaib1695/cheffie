import { ChefAreas, Menu, Chef, ChefAvailibility, ChefDocuments } from '../models/index'
const { Op } = require("sequelize");

export const updateChefStatus = async (chefId) => {

  const getAllmenus = await Menu.count({ where: { status: { [Op.not]: 'deleted' }, chefId: chefId } })
  const getAllmenusAccepted = await Menu.count({ where: { status: 'accepted', chefId: chefId } })

  const getAllChefAreas = await ChefAreas.count({
    where: {
      chefId: chefId, status: {
        [Op.ne]: ['default']
      }
    }
  })
  const getAllChefAreasAccepted = await ChefAreas.count({ where: { status: 'accepted', chefId: chefId } })
  const getAllChefAvailability = await ChefAvailibility.count({ where: { ending_date: { [Op.gt]: new Date().toISOString().split('T')[0] }, chef_id: chefId } })
  const getAllChefAvailabilityAccepted = await ChefAvailibility.count({ where: { status: 'accepted', ending_date: { [Op.gt]: new Date().toISOString().split('T')[0] }, chef_id: chefId } })
  const getAllChefDocuments = await ChefDocuments.count({ where: { chef_id: chefId } })
  const getAllChefDocumentsAccepted = await ChefDocuments.count({ where: { status: 'accepted', chef_id: chefId } })
  const chefProfile = await Chef.findOne({ where: { id: chefId }, attributes: ['isProfileApproved'] })
  const chefAllUKLoc = await Chef.findOne({ where: { id: chefId }, raw: true })

  if (chefAllUKLoc?.is_all_service_areas === 'accepted') {
    if (
      (getAllChefDocuments == getAllChefDocumentsAccepted) &&
      getAllChefDocumentsAccepted > 0 &&
      (getAllChefAvailability == getAllChefAvailabilityAccepted) &&
      getAllChefAvailabilityAccepted > 0 &&
      (getAllmenus == getAllmenusAccepted) &&
      getAllmenusAccepted > 0 &&
      chefProfile.dataValues.isProfileApproved
      && chefAllUKLoc?.is_all_service_areas === 'accepted'
    ) {
      const resp = Chef.update({ isActive: "accepted" }, { where: { id: chefId } })
    } else {
      const resp = Chef.update({ isActive: "pending" }, { where: { id: chefId } })
    }
  }
  else {
    if (
      (getAllChefDocuments == getAllChefDocumentsAccepted) &&
      getAllChefDocumentsAccepted > 0 &&
      (getAllChefAvailability == getAllChefAvailabilityAccepted) &&
      getAllChefAvailabilityAccepted > 0 &&
      (getAllChefAreas == getAllChefAreasAccepted) &&
      getAllChefAreasAccepted > 0 &&
      (getAllmenus == getAllmenusAccepted) &&
      getAllmenusAccepted > 0 &&
      chefProfile.dataValues.isProfileApproved
    ) {
      const resp = Chef.update({ isActive: "accepted" }, { where: { id: chefId } })
    } else {
      const resp = Chef.update({ isActive: "pending" }, { where: { id: chefId } })
    }
  }

}