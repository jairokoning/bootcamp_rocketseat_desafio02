import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class MeetupListController {
  async index(req, res) {
    const { page = 1, date } = req.query;
    const parseDate = date ? parseISO(date) : new Date();
    const meetups = await Meetup.findAll({
      where: {
        date: {
          [Op.between]: [startOfDay(parseDate), endOfDay(parseDate)],
        },
      },
      limit: 10,
      offset: (page - 1) * 10,
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
    });

    return res.json(meetups);
  }
}

export default new MeetupListController();
