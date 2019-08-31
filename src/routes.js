import { Router } from 'express';
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import authMiddleware from './app/middleware/auth';

const routes = new Router();

routes.get('/users', (req, res) => res.json({ message: 'Hello world' }));
routes.post('/user', UserController.store);
routes.post('/session', SessionController.store);
routes.use(authMiddleware);
routes.put('/user', UserController.update);

export default routes;
