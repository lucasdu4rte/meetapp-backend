import {
  startOfHour,
  parseISO,
  isAfter,
  isSameDay,
  isSameHour,
} from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';
import Mail from '../../lib/Mail';
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
    const { meetupId } = req.params;
    const meetup = await Meetup.findByPk(meetupId, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) {
      return res.status(404).json({
        error: 'O meetup não foi encontrado',
      });
    }

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

    const checkMeetupSameDateHour = userWithMeetups
      .toJSON()
      .meetups.find(currentMeetup => {
        return (
          isSameDay(currentMeetup.date, meetup.date) &&
          isSameHour(currentMeetup.date, meetup.date)
        );
      });

    if (checkMeetupSameDateHour) {
      return res.status(400).json({
        error: 'Não permitido se inscrever em um meetup com o mesmo hórario',
      });
    }

    await meetup.addUser(userId);

    await Mail.sendMail({
      to: `${meetup.provider.name} <${meetup.provider.email}>`,
      subject: 'Nova inscrição no Meetup',
      text: 'Seu Meetup tem um novo inscrito',
    });

    return res.json(meetup);
  }

  async delete(req, res) {
    const { userId } = req;
    const { meetupId } = req.params;
    const meetup = await Meetup.findByPk(meetupId);

    if (!meetup) {
      return res.status(404).json({
        error: 'O meetup não foi encontrado',
      });
    }

    if (meetup.provider_id === userId) {
      return res.status(401).json({
        error: 'O organizador do meetup não pode se inscrever no meetup',
      });
    }

    await meetup.removeUser(userId);

    return res.json(meetup);
  }
}

export default new SubscriptionController();
