import { Router } from 'express';
import multer from 'multer';
import multerConfig from './config/multer';

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import authMiddleware from './app/middleware/auth';
import FileController from './app/controllers/FileController';
import MeetupController from './app/controllers/MeetupController';
import MeetupListController from './app/controllers/MeetupListController';
import RegistrationController from './app/controllers/RegistrationController';

const routes = new Router();
const upload = multer(multerConfig);

routes.get('/users', (req, res) => res.json({ message: 'Hello world' }));
routes.post('/user', UserController.store);
routes.post('/session', SessionController.store);
routes.use(authMiddleware);
routes.put('/user', UserController.update);

routes.post('/files', upload.single('file'), FileController.store);

routes.get('/meetup', MeetupController.index);
routes.post('/meetup', MeetupController.store);
routes.put('/meetup/:id', MeetupController.update);
routes.delete('/meetup/:id', MeetupController.delete);

routes.get('/meetups', MeetupListController.index);

routes.get('/registrations', RegistrationController.index);
routes.post('/registrations', RegistrationController.store);

export default routes;
