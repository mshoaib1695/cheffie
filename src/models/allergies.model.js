const AllergySchema = (sequelize, Sequelize) => {
    const { DataTypes } = Sequelize
    const { STRING, INTEGER } = DataTypes
      const Allergy = sequelize.define("allergies", {
        name: {
          type: STRING
        },
    }, {
      timestamps: false,
      underscored: true
  })

  const BookingAllergies = sequelize.define("booking_allergies", {
    bookingId: {
        type: INTEGER,
        primaryKey: true,
    },
    allergyId: {
        type: INTEGER,
        primaryKey: true,
    }
});
    return {Allergy, BookingAllergies};

}

export default AllergySchema;