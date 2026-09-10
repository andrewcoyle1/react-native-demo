/**
 * Entry point. Migrates, then serves.
 *
 * Migrating on boot is right while this is one developer and one process: the
 * schema can never lag the code that expects it. With several instances
 * deploying at once it becomes a race, and migration moves to a release step.
 */
import { buildApp } from './app.ts';
import { config } from './config.ts';
import { pool } from './db.ts';
import { migrate } from './migrate.ts';

const app = buildApp();

try {
  const ran = await migrate();
  if (ran.length) {
    app.log.info({ ran }, 'applied migrations');
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.log.info('shutting down');
    // Stop accepting connections, finish what is in flight, then let the pool go.
    app.close().then(() => pool.end()).then(() => process.exit(0));
  });
}
