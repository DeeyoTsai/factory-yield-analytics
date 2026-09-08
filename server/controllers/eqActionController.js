const { EqAction } = require('../models');
const { Op } = require('sequelize');

exports.getAllEqActions = async (req, res) => {
  try {
    const { startend, line } = req.query;
    const where = {};
    
    if (startend) {
      where.startend = startend;
    }
    
    if (line) {
      where.line = line;
    }

    const actions = await EqAction.findAll({
      where,
      order: [['begintime', 'ASC']]
    });
    res.status(200).json(actions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEqActionById = async (req, res) => {
  try {
    const action = await EqAction.findByPk(req.params.id);
    if (action) {
      res.status(200).json(action);
    } else {
      res.status(404).json({ message: 'EqAction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createEqAction = async (req, res) => {
  try {
    const newAction = await EqAction.create(req.body);
    res.status(201).json(newAction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
