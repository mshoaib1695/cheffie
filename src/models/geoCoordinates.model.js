
const GeoCoordinatesSchema = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;
  const { STRING, INTEGER } = DataTypes;
  const GeoCoordinates = sequelize.define(
    'geocoordinates',
    {      
      address: {
        type: STRING,
      },
      country: {
        type: STRING,
      },
      elevation: {
        type: STRING,
      },
      latitude: {
        type: INTEGER,
      },
      longitude: {
        type: INTEGER,
      },
      postal_code: {
        type: STRING,
      },
      description: {
        type: STRING,
      },
    },
    {
      underscored: true,
    }
  );
  return GeoCoordinates;
}

export default GeoCoordinatesSchema;