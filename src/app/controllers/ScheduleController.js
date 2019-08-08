import Event from '../models/Event';
import User from '../models/User';

class ScheduleController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const events = await Event.findAll({
      // Ter um controller para o organizador
      where: { provider_id: req.userId },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
        },
      ],
    });

    return res.json(events);
  }
}

export default new ScheduleController();
