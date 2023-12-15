import 'dotenv/config';
import OpenAI from 'openai';
import express from 'express';

const openAIRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

openAIRouter.post('/chat-completions', async (req, res) => {
  const content = req.body.content;
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-16k',
    messages: [
      {
        role: 'system',
        content:
          'You are Hedro, a helpful assistant whose main goal is to guide users to explore the ecosystem of the Hedera network.',
      },
      { role: 'user', content },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
  console.log();
});

openAIRouter.post('/creater-new-assistant', async (req, res) => {
  const newAssistant = await openai.beta.assistants.create({
    instructions: req.body.instructions,
    name: req.body.name,
    tools: req.body.tools,
    model: req.body.model,
  });

  res.send(newAssistant);
});

openAIRouter.post('/create-new-thread', async (req, res) => {
  const thread = await openai.beta.threads.create();

  res.send(thread);
});

openAIRouter.post('/talk-to-assistant', async (req, res) => {
  const content = req.body.content;
  const asstId = req.body.asstId;
  const threadId = req.body.threadId;

  // create message - automatically append to thread
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content,
  });

  // run thread
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: asstId,
  });

  let runStat = await openai.beta.threads.runs.retrieve(threadId, run.id);

  while (runStat.status !== 'completed') {
    console.log(runStat.status);
    await new Promise((r) => setTimeout(r, 2000));
    runStat = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }

  console.log(runStat.status);

  const completed_messages = await openai.beta.threads.messages.list(threadId);
  res.send(completed_messages.data);
});

export default openAIRouter;
