const ChefAreasSchema = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { INTEGER, STRING } = DataTypes
      const chefAreas = sequelize.define("chef_areas", {
        chef_id: {
          type: INTEGER,

        },
        post_code: {
          type: STRING
        },
        status: {
          type: STRING
        }
    }, {
        underscored: true
    });
    return chefAreas; 

}
export default ChefAreasSchema;