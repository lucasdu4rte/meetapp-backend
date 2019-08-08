import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, isAfter } from 'date-fns';
import Event from '../models/Event';
import User from '../models/User';

class EventController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const events = await Event.findAll({
      // where: { provider_id: req.userId },
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

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      localization: Yup.string().required(),
      date: Yup.date().required(),
      banner: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { title, description, localization, date, banner } = req.body;
    const { userId } = req;

    /**
     * Verifique se o evento já foi realizado
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const event = await Event.create({
      title,
      description,
      localization,
      date,
      banner,
      provider_id: userId,
    });

    return res.json(event);
  }

  async update(req, res) {
    const { id } = req.params;
    const { userId } = req;

    const checkUserIsProvider = await Event.findOne({
      where: { id, provider_id: userId },
    });

    if (!checkUserIsProvider) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      localization: Yup.string().required(),
      date: Yup.date().required(),
      banner: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { title, description, localization, date, banner } = req.body;

    /**
     * Verifique se o evento já foi realizado
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const event = await Event.findByPk(id);

    const updatedEvent = await event.update({
      title,
      description,
      localization,
      date,
      banner,
    });

    return res.json(updatedEvent);
  }

  async destroy(req, res) {
    const { id } = req.params;
    const { userId } = req;

    const event = await Event.findOne({
      where: { id, provider_id: userId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    /**
     * Check user is provider of Event
     */
    if (event.provider_id !== userId) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    /**
     * Check if the event has already been held
     */
    const hourStart = startOfHour(parseISO(event.date));

    if (isAfter(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Event already held is not allowed edit' });
    }

    await event.destroy();

    return res.json(event);
  }
}

export default new EventController();
