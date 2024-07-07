import { ChefAreas, ChefAvailibility, Menu } from "./index"
const UserSchema = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize
  const { STRING, INTEGER, DATEONLY, BOOLEAN, DATE } = DataTypes
  const User = sequelize.define("user", {
    full_name: {
      type: STRING
    },
    email: {
      type: STRING
    },
    password: {
      type: STRING
    },
    user_role: {
      type: STRING
    },
  }, {
    timestamps: false,
    underscored: true
  });
  const ChefReq = sequelize.define("chef_req", {
    userId: {
      type: INTEGER
    },
    password: {
      type: STRING
    },
    isAccepted: {
      type: BOOLEAN
    },
    isRejected: {
      type: BOOLEAN
    },
    is18Plus: {
      type: BOOLEAN
    },
    workRights: {
      type: BOOLEAN
    },
    termsCondition: {
      type: BOOLEAN
    },
    createdAt: {
      type: BOOLEAN
    },
    bio: {
      type: STRING
    },
  }, {
    timestamps: false,
    underscored: true
  });

  const Role = sequelize.define("role", {
    role_name: {
      type: STRING,
    },

  }, {
    timestamps: false,
    underscored: true
  });

  const Customer = sequelize.define("customer", {
    user_id: {
      type: INTEGER,
    },
    stripe_cus_id: {
      type: STRING
    },
    status: {
      type: STRING
    }
  }, {
    timestamps: false,
    underscored: true
  });
  const Chef = sequelize.define("chef", {
    user_id: {
      type: INTEGER,
    },
    description: {
      type: STRING
    },
    image: {
      type: STRING
    },
    intro: {
      type: STRING
    },
    title: {
      type: STRING
    },
    city: {
      type: STRING
    },
    rating: {
      type: INTEGER
    },
    reviews: {
      type: INTEGER
    },
    on_board: {
      type: BOOLEAN
    },
    starting_rate: {
      type: INTEGER
    },
    max_persons: {
      type: INTEGER,
      default: 2
    },
    stripe_chef_id: {
      type: STRING
    },
    addressline1: {
      type: STRING
    },
    addressline2: {
      type: STRING
    },
    dob: {
      type: DATEONLY
    },
    postcode: {
      type: STRING
    },
    isActive: {
      type: STRING
    },
    isLive: {
      type: BOOLEAN
    },
    isProfileApproved: {
      type: BOOLEAN
    },
    all_service_areas:{
      type: BOOLEAN
    },
    is_all_service_areas: {
      type: STRING
    }
  }, {
    underscored: true,
  });
  const PhoneNumber = sequelize.define("phone_numbers", {
    country_code: {
      type: STRING
    },
    dialing_code: {
      type: STRING
    },
    national_number: {
      type: STRING
    },
    user_id: {
      type: INTEGER
    },
  }, {
    timestamps: false,
    underscored: true,
  });
  const ChefDocuments = sequelize.define("chef_document", {
    id: {
      type: INTEGER,
      primaryKey: true
    },
    chef_id: {
      type: INTEGER
    },
    key: {
      type: STRING
    },
    status: {
      type: STRING
    },
    document_type: {
      type: STRING // cv, passport_id, hygiene_certificate,  dbs_check,
    },
    created_at: {
      type: DATE, defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DATE, defaultValue: DataTypes.NOW
    },
  }, {
    timestamps: false,
    underscored: true,
  });
  const Notifications = sequelize.define("notification_setting", {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: INTEGER,
    },
    app_notifications: {
      type: BOOLEAN
    },
    news_offers_notifications: {
      type: BOOLEAN
    },
    created_at: {
      type: DATE, defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DATE, defaultValue: DataTypes.NOW
    },
  }, {
    timestamps: false,
    underscored: true
  });


  Chef.hasMany(ChefAreas);
  Chef.hasMany(ChefAvailibility);
  Chef.hasMany(ChefDocuments);
  Customer.belongsTo(User);
  Chef.belongsTo(User);
  ChefReq.belongsTo(User);
  Notifications.belongsTo(User);
  User.hasMany(PhoneNumber);
  User.belongsTo(Role);
  // Chef.belongsToMany(Menu, { through: 'chefmenus' });
  User.addHook('afterCreate', async (user) => {
    // We can use `options.transaction` to perform some other call
    // using the same transaction of the call that triggered this hook
    await Notifications.create({ 
      user_id: user.id
     });
  });

  return { User, Customer, Chef, Role, PhoneNumber, ChefReq, ChefDocuments,Notifications};
};

export default UserSchema