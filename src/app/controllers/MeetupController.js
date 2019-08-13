import * as Yup from 'yup';
import {
  startOfHour,
  parseISO,
  isBefore,
  isAfter,
  endOfDay,
  startOfDay,
} from 'date-fns';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';

class MeetupController {
  async index(req, res) {
    const { page = 1, date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const meetups = await Meetup.findAll({
      where: {
        date: {
          [Op.between]: [startOfDay(new Date(date)), endOfDay(new Date(date))],
        },
      },
      order: [['date', 'DESC']],
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
        },
        // {
        //   model: User,
        //   as: 'users',
        //   attributes: ['id', 'name'],
        // },
      ],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      localization: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Falha na validação, por favor revise seus dados' });
    }

    const { title, description, localization, date, banner_id } = req.body;
    const { userId } = req;

    /**
     * Verifique se o meetup já foi realizado
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Não é permitido criar meetup com datas passadas' });
    }

    const meetup = await Meetup.create({
      title,
      description,
      localization,
      date,
      banner_id,
      provider_id: userId,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const { id } = req.params;
    const { userId } = req;

    const checkUserIsProvider = await Meetup.findOne({
      where: { id, provider_id: userId },
    });

    if (!checkUserIsProvider) {
      return res
        .status(401)
        .json({ error: 'Usuário não é o organizador deste meetup' });
    }

    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      localization: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Falha na validação dos dados' });
    }

    const { title, description, localization, date, banner_id } = req.body;

    /**
     * Verifique se o meetup já foi realizado
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Não é permitido alterar um meetup que já realizado' });
    }

    const meetup = await Meetup.findByPk(id);

    const updatedMeetup = await meetup.update({
      title,
      description,
      localization,
      date,
      banner_id,
    });

    return res.json(updatedMeetup);
  }

  async destroy(req, res) {
    const { id } = req.params;
    const { userId } = req;

    const meetup = await Meetup.findOne({
      where: { id, provider_id: userId },
    });

    if (!meetup) {
      return res.status(404).json({ error: 'meetup não encontrado' });
    }

    /**
     * Check user is provider of Meetup
     */
    if (meetup.provider_id !== userId) {
      return res
        .status(401)
        .json({ error: 'Usuário não é organizador deste meetup' });
    }

    /**
     * Check if the meetup has already been held
     */
    const hourStart = startOfHour(parseISO(meetup.date));

    if (isAfter(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Meetup já realizado não é permitido editar' });
    }

    await meetup.destroy();

    return res.json(meetup);
  }
}

export default new MeetupController();
