import {
  startOfHour,
  parseISO,
  isAfter,
  isSameDay,
  isSameHour,
} from 'date-fns';
import Event from '../models/Event';
import User from '../models/User';
// import User from '../models/User';

class SubscriptionController {
  async index(req, res) {
    const { userId } = req;
    const userWithEvents = await User.findByPk(userId, {
      include: [
        {
          model: Event,
          as: 'events',
          through: { attributes: [] },
        },
      ],
    });

    return res.json(userWithEvents.events);
  }

  async update(req, res) {
    const { userId } = req;
    const { id: eventId } = req.params;
    const event = await Event.findByPk(eventId);

    /**
     * Verifique se o usuário não é provedor
     */
    if (event.provider_id === userId) {
      return res
        .status(401)
        .json({ error: 'Usuário não é o organizador deste evento' });
    }

    /**
     * Verifique se o evento já foi realizado
     */
    const hourStart = startOfHour(parseISO(event.date));

    if (isAfter(hourStart, new Date())) {
      return res.status(400).json({
        error: 'Evento já realizado não é permitido se inscrever',
      });
    }

    // O usuário não pode se inscrever em dois meetups que acontecem no mesmo horário.
    const userWithEvents = await User.findByPk(userId, {
      include: [
        {
          model: Event,
          as: 'events',
          through: { attributes: [] },
        },
      ],
    });

    const checkEventSameDateHour = userWithEvents.events.find(currentEvent => {
      return (
        isSameDay(parseISO(currentEvent.date), parseISO(event.date)) &&
        isSameHour(parseISO(currentEvent.date), parseISO(event.date))
      );
    });

    if (checkEventSameDateHour) {
      return res.status(400).json({
        error: 'Não permitido se inscrever em um meetup com o mesmo hórario',
      });
    }

    await event.addUser(userId);

    return res.json(event);
  }

  async delete(req, res) {
    const { userId } = req;
    const { id: eventId } = req.params;
    const event = await Event.findByPk(eventId);

    if (event.provider_id === userId) {
      return res.json(401).json({
        error: 'O organizador do evento não pode se inscrever no evento',
      });
    }

    await event.removeUser(userId);

    return res.json(event);
  }
}

export default new SubscriptionController();
