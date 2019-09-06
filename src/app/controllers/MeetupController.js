import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      include: [
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({
        error:
          'Validação falhou. Verifique se você informou todos os campos obrigatórios',
      });
    }

    const { title, description, location, date, banner_id } = req.body;

    /**
     * Check for past dates
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Não é permitido informar uma data que já passou' });
    }

    const meetup = await Meetup.create({
      title,
      description,
      location,
      date,
      banner_id,
      user_id: req.userId,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      banner_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Validação dos dados informados falhou' });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup não encontrado' });
    }

    const hourStart = startOfHour(parseISO(meetup.date));

    if (isBefore(hourStart, new Date())) {
      return res
        .status(400)
        .json({ error: 'Não é permitido alterar um Meetup que já ocorreu' });
    }

    if (req.body.date) {
      const newHourStart = startOfHour(parseISO(req.body.date));
      if (isBefore(newHourStart, new Date())) {
        return res.status(400).json({ error: 'Data já passou' });
      }
    }

    if (req.userId !== meetup.user_id) {
      return res.status(401).json({
        error:
          'Você não tem permissão para alterar este Meetup, pois não é o organizador ',
      });
    }

    const { title, description, location, date } = await meetup.update(
      req.body
    );

    return res.json({
      title,
      description,
      location,
      date,
    });
  }
}

export default new MeetupController();
