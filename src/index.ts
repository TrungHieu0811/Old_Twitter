import express from 'express';
import usersRouter from './routes/users.route';
import databaseService from './services/database.services';
import { defaultErrorHandler } from './middlewares/error.middlewares';
import mediaRouter from './routes/medias.route';
import { initFolder } from './utils/file';
import { config } from 'dotenv';
import argv from 'minimist';
import staticRouter from './routes/static.routes';
import { UPLOAD_VIDEO_DIR } from './constants/dir';
import cors from 'cors';

config();

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());

databaseService.connect();

initFolder();

app.use(express.json());

app.use('/users', usersRouter);
app.use('/medias', mediaRouter);
app.use('/static', staticRouter);

app.use('/static/video', express.static(UPLOAD_VIDEO_DIR));

app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
