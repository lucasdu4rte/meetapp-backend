module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('files', {
      id: {
        type: Sequelize.INTEGER,
        allowNul: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNul: false,
      },
      path: {
        type: Sequelize.STRING,
        allowNul: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('files');
  },
};
