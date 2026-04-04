import express from 'express';
import usersRouter from './routes/users.route';
import databaseService from './services/database.services';

const app = express();
const port = 3000;

databaseService.connect().catch(console.dir);

app.use(express.json());

app.use('/users', usersRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
