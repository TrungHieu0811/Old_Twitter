import express from 'express';
import usersRouter from './routes/users.route';
import databaseService from './services/database.services';
import { defaultErrorHandler } from './middlewares/error.middlewares';
import mediaRouter from './routes/medias.route';
import { initFolder } from './utils/file';

const app = express();
const port = 4000;

databaseService.connect();

initFolder();

app.use(express.json());

app.use('/users', usersRouter);
app.use('/medias', mediaRouter);

app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
