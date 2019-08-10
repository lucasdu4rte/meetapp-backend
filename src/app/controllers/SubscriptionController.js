import {
  startOfHour,
  parseISO,
  isAfter,
  isSameDay,
  isSameHour,
} from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';
// import User from '../models/User';

class SubscriptionController {
  async index(req, res) {
    const { userId } = req;
    const userWithMeetups = await User.findByPk(userId, {
      include: [
        {
          model: Meetup,
          as: 'meetups',
          through: { attributes: [] },
        },
      ],
    });

    return res.json(userWithMeetups.meetups);
  }

  async update(req, res) {
    const { userId } = req;
    const { id: meetupId } = req.params;
    const meetup = await Meetup.findByPk(meetupId);

    /**
     * Verifique se o usuário não é provedor
     */
    if (meetup.provider_id === userId) {
      return res.status(401).json({
        error:
          'O organizador do meetup não pode se inscrever no próprio meetup',
      });
    }

    /**
     * Verifique se o meetup já foi realizado
     */
    const hourStart = startOfHour(parseISO(meetup.date));

    if (isAfter(hourStart, new Date())) {
      return res.status(400).json({
        error: 'meetup já realizado não é permitido se inscrever',
      });
    }

    // O usuário não pode se inscrever em dois meetups que acontecem no mesmo horário.
    const userWithMeetups = await User.findByPk(userId, {
      include: [
        {
          model: Meetup,
          as: 'meetups',
          through: { attributes: [] },
        },
      ],
    });

    const checkMeetupSameDateHour = userWithMeetups.meetups.find(
      currentMeetup => {
        return (
          isSameDay(parseISO(currentMeetup.date), parseISO(meetup.date)) &&
          isSameHour(parseISO(currentMeetup.date), parseISO(meetup.date))
        );
      }
    );

    if (checkMeetupSameDateHour) {
      return res.status(400).json({
        error: 'Não permitido se inscrever em um meetup com o mesmo hórario',
      });
    }

    await meetup.addUser(userId);

    return res.json(meetup);
  }

  async delete(req, res) {
    const { userId } = req;
    const { id: meetupId } = req.params;
    const meetup = await Meetup.findByPk(meetupId);

    if (meetup.provider_id === userId) {
      return res.json(401).json({
        error: 'O organizador do meetup não pode se inscrever no meetup',
      });
    }

    await meetup.removeUser(userId);

    return res.json(meetup);
  }
}

export default new SubscriptionController();
