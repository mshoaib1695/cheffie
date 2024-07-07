const LogSchema = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize
  const { STRING, DATE, JSON } = DataTypes
    const Log = sequelize.define("log", {
      method: {
        type: STRING
      },
      endpoint: {
        type: STRING
      },
      ip: {
        type: STRING
      },
      payload: {
        type: JSON
      },
      host: {
        type: STRING
      },
      user_agent: {
        type: STRING
      },      
      createdAt: {
        type: DATE, defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DATE, defaultValue: DataTypes.NOW
      },    
    });
  
    return Log;
  };

  export default LogSchema
