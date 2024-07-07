const ChatMessages = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize
  const { STRING, INTEGER, BOOLEAN, DATE, BIGINT } = DataTypes

  const Chat = sequelize.define("chat", {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: INTEGER,
    },
    chef_id: {
      type: INTEGER,
    },
    status: {
      type: STRING
    },
    createdAt: {
      type: DATE, defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DATE, defaultValue: DataTypes.NOW
    },
  }
  );
  const Message = sequelize.define("message", {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    chat_id: {
      type: INTEGER,
    },
    msg: {
      type: STRING
    },
    isImg: {
      type: BOOLEAN
    },
    receiver: {
      type: INTEGER,
    },
    sender: {
      type: INTEGER,
    },
    status: {
      type: STRING
    },
    datetime: {
      type: DATE, defaultValue: DataTypes.NOW
    },

  },
    {
      timestamps: false,
    }
  );

  const Image = sequelize.define("image", {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: STRING,
    },
    url: {
      type: STRING,
    },
    width: {
      type: BIGINT
    },
    height: {
      type: BIGINT
    },
    mimetype: {
      type: STRING,
    },
    ext: {
      type: STRING,
    },
    createdAt: {
      type: DATE, defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DATE, defaultValue: DataTypes.NOW
    }
  });
  return { Chat, Message, Image };

}

export default ChatMessages;


