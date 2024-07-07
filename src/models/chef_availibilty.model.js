const ChefAvailibilitySchema = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { INTEGER, DATE, TIME , STRING} = DataTypes
      const ChefAvailibility = sequelize.define("chef_availability", {
        chef_id: {
          type: INTEGER
        },
        starting_date: {
          type: DATE
        },
        ending_date: {
          type: DATE
        },
        starting_time: {
          type: TIME
        },
        ending_time: {
          type: TIME
        },
        status: {
          type: STRING
        }
    }, {
        underscored: true
    });
    return ChefAvailibility;

}
export default ChefAvailibilitySchema;