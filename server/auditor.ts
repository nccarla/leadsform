import { pool } from '../db/index.js';

export function startMeetingAuditor() {
  console.log('--- Auditor de reuniones activado (Check cada 60s) ---');

  setInterval(async () => {
    try {
      // 1. Buscamos auditorías pendientes que estén a 15 min de empezar
      const query = `
        SELECT * FROM audits 
        WHERE status = 'pending'
        AND start_time <= now() + (reminder_minutes * interval '1 minute')
        AND start_time > now()
      `;

      const { rows } = await pool.query(query);

      for (const meeting of rows) {
        console.log(`[ALERTA AUDITOR]: La reunión con ${meeting.client_name} está por comenzar.`);


        // 2. Marcamos como alertada para no repetir
        await pool.query('UPDATE audits SET status = $1 WHERE id = $2', ['alerted', meeting.id]);
      }
    } catch (error) {
      console.error('[Error Auditor]:', error);
    }
  }, 60000);
}
