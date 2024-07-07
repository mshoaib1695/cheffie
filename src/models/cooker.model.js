const CookerSchema = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { STRING, INTEGER } = DataTypes
      const Cooker = sequelize.define("cooker", {
        id: {
          type: INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: STRING
        },

    })

    return Cooker;

}

export default CookerSchema;