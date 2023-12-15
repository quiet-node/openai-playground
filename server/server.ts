import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import openAIRouter from './routes/api/openai-api';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/chat-with-hedro', openAIRouter);

const PORT = process.env.PORT || 6739;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
