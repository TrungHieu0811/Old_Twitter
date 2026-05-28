import express from 'express';
import usersRouter from './routes/users.route';
import databaseService from './services/database.services';
import { defaultErrorHandler } from './middlewares/error.middlewares';
import mediaRouter from './routes/medias.routes';
import { initFolder } from './utils/file';
import { config } from 'dotenv';
import argv from 'minimist';
import staticRouter from './routes/static.routes';
import { UPLOAD_VIDEO_DIR } from './constants/dir';
import cors from 'cors';
import tweetRouter from './routes/tweets.routes';
import bookmarkRouter from './routes/bookmarks.routes';
import likeRouter from './routes/likes.routes';

config();

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());

databaseService.connect().then(() => {
  databaseService.indexUsers();
  databaseService.indexRefreshTokens();
  databaseService.indexVideoStatus();
  databaseService.indexFollowers();
});

initFolder();

app.use(express.json());

app.use('/users', usersRouter);
app.use('/medias', mediaRouter);
app.use('/tweets', tweetRouter);
app.use('/bookmarks', bookmarkRouter);
app.use('/likes', likeRouter);
app.use('/static', staticRouter);

app.use('/static/video', express.static(UPLOAD_VIDEO_DIR));

app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
