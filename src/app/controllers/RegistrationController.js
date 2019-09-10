import * as Yup from 'yup';
import { Op } from 'sequelize';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Meetup from '../models/Meetup';
import Registration from '../models/Registration';
import Queue from '../../lib/Queue';
import RegistrationMail from '../jobs/RegistrationMail';
import User from '../models/User';
import File from '../models/File';

class RegistrationController {
  async index(req, res) {
    const registration = await Registration.findAll({
      where: { user_id: req.userId },
      order: [['meetup', 'date', 'ASC']],
      include: [
        {
          model: Meetup,
          as: 'meetup',
          where: {
            date: {
              [Op.gte]: new Date(),
            },
          },
          attributes: ['title', 'description', 'location', 'date'],
          include: [
            {
              model: File,
              as: 'banner',
              attributes: ['id', 'path', 'url'],
            },
            {
              model: User,
              as: 'organizer',
              attributes: ['name', 'email'],
            },
          ],
        },
      ],
    });

    return res.json(registration);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      meetup_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({
        error:
          'Validação falhou. Verifique se você informou todos os campos obrigatórios',
      });
    }

    const { meetup_id } = req.body;
    const meetup = await Meetup.findByPk(meetup_id, {
      include: [
        {
          model: User,
          as: 'organizer',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup não encontrado' });
    }

    if (req.userId === meetup.user_id) {
      return res.status(400).json({
        error:
          'Você somente pode efetuar inscrição em Meetups de outros organizadores',
      });
    }

    /**
     * Check for past dates
     */
    const hourStart = startOfHour(meetup.date);

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({
        error: 'Não é possível efetuar inscrição em Meetups que já ocorreram',
      });
    }

    const alredyExistsInRegistration = await Registration.findOne({
      where: { meetup_id, user_id: req.userId },
    });

    if (alredyExistsInRegistration) {
      return res
        .status(400)
        .json({ error: 'Você já se inscreveu neste Meetup' });
    }

    const meetupAtSameTime = await Registration.findAll({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          attributes: ['date'],
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (meetupAtSameTime.date) {
      // console.log(meetupAtSameTime);
      return res.status(400).json({
        error:
          'Não é possível efetuar inscrição em mais de um Meetup que ocorre no mesmo horário',
      });
    }

    const registration = await Registration.create({
      meetup_id,
      user_id: req.userId,
    });

    const user = await User.findByPk(req.userId);

    await Queue.add(RegistrationMail.key, {
      meetup,
      user,
    });

    return res.json(registration);
  }

  // async update(req, res) {
  //   const schema = Yup.object().shape({
  //     title: Yup.string(),
  //     description: Yup.string(),
  //     location: Yup.string(),
  //     date: Yup.date(),
  //     banner_id: Yup.number(),
  //   });

  //   if (!(await schema.isValid(req.body))) {
  //     return res
  //       .status(400)
  //       .json({ error: 'Validação dos dados informados falhou' });
  //   }

  //   const meetup = await Meetup.findByPk(req.params.id);

  //   if (!meetup) {
  //     return res.status(400).json({ error: 'Meetup não encontrado' });
  //   }

  //   const hourStart = startOfHour(parseISO(meetup.date));

  //   if (isBefore(hourStart, new Date())) {
  //     return res
  //       .status(400)
  //       .json({ error: 'Não é permitido alterar um Meetup que já ocorreu' });
  //   }

  //   if (req.body.date) {
  //     const newHourStart = startOfHour(parseISO(req.body.date));
  //     if (isBefore(newHourStart, new Date())) {
  //       return res.status(400).json({ error: 'Data já passou' });
  //     }
  //   }

  //   if (req.userId !== meetup.user_id) {
  //     return res.status(401).json({
  //       error:
  //         'Você não tem permissão para alterar este Meetup, pois não é o organizador ',
  //     });
  //   }

  //   const { title, description, location, date } = await meetup.update(
  //     req.body
  //   );

  //   return res.json({
  //     title,
  //     description,
  //     location,
  //     date,
  //   });
  // }

  // async delete(req, res) {
  //   const meetup = await Meetup.findByPk(req.params.id);

  //   if (!meetup) {
  //     return res.status(400).json({ error: 'Meetup não encontrado' });
  //   }

  //   const hourStart = startOfHour(meetup.date);

  //   if (isBefore(hourStart, new Date())) {
  //     return res
  //       .status(400)
  //       .json({ error: 'Não é permitido cancelar um Meetup que já ocorreu' });
  //   }
  //   // return res.json({
  //   //   a: hourStart,
  //   //   b: new Date(),
  //   //   before: isBefore(hourStart, new Date()),
  //   // });
  //   if (req.userId !== meetup.user_id) {
  //     return res.status(401).json({
  //       error:
  //         'Você não tem permissão para cancelar este Meetup, pois não é o organizador',
  //     });
  //   }

  //   await meetup.destroy();

  //   return res.json({ message: 'Meetup cancelado com sucesso' });
  // }
}

export default new RegistrationController();
