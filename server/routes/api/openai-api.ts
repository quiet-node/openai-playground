import fs from 'fs';
import 'dotenv/config';
import OpenAI from 'openai';
import express from 'express';
import upload from '../../middleware/file-upload';

const openAIRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

openAIRouter.post('/chat-completions', async (req, res) => {
  const content = req.body.content;
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',
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

  res.send(stream);
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

openAIRouter.post(
  '/generate-dataset',
  upload.single('hedera-docs'),
  async (req, res) => {
    const file = req.file;
    const pairNum = req.body.pairNum;
    const fileContent = fs.readFileSync(file!.path, 'ascii');

    const prompt = `Please regard to this "information base" here:
\`\`\`
${fileContent}
\`\`\`
Generate a list of at least ${pairNum} Q&A pairs. REMEMBER THAT the list has at least ${pairNum} pairs. REMEMBER THAT I want the Q&A pairs to cover all the information provided by the file. `;

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        {
          role: 'system',
          content:
            'You are professional at making questions and answers by examinating the information base provided by user. REMEBER TO focus on Hedera network items. REMEMBER THAT each pair of Q&A is distributed in an object like this: {"messages": [{"role": "user", "content": [question goes here]}, {"role": "assistant", "content": [answers goes here ]}]}. REMEMBER THAT for each object, please stringify it and apply no format at all. REMEMBER THAT the object should have NO EXTRA SPACE or DO NOT break down to a new line.',
        },
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    const datasetFileName = `dataset/${file!.originalname.replace(
      '.md',
      ''
    )}.jsonl`;

    var writeStream = fs.createWriteStream(datasetFileName);
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
      writeStream.write(chunk.choices[0]?.delta?.content || '');
    }
    writeStream.end();
    console.log('\nDone.\n');
    res.send(pairNum);
  }
);

export default openAIRouter;
