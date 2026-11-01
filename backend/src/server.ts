import { env } from './config/env';
import { connectDb } from './config/db';
import { app } from './app';
import { startWorkers } from './queues/workers';

async function main() {
  await connectDb();
  // Workers run in the API process for a one-command setup; set WORKERS=off and run `npm run worker` to split them.
  if (process.env.WORKERS !== 'off') startWorkers();
  app.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}`));
}
main().catch((e) => { console.error(e); process.exit(1); });
