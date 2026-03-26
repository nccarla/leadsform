import { pool } from '../db/index.js';

export function startMeetingAuditor() {
  console.log('--- Auditor de reuniones activado (Check cada 60s) ---');
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    console.warn('[Auditor] MAKE_WEBHOOK_URL no está configurado; solo se registrarán logs locales.');
  }

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

        if (makeWebhookUrl) {
          const payload = {
            accion: 'alerta',
            id: meeting.id,
            client_id: meeting.client_id,
            cliente: {
              id: meeting.client_id,
              nombre: meeting.client_name,
              correo: meeting.client_email,
              telefono: meeting.client_phone,
              pais: meeting.country,
            },
            client_name: meeting.client_name,
            client_email: meeting.client_email,
            client_phone: meeting.client_phone,
            advisor_name: meeting.advisor_name,
            advisor_status: meeting.advisor_status,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            subject: meeting.subject,
            location: meeting.location,
            country: meeting.country,
          };

          const response = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Auditor] Error enviando webhook a Make:', response.status, errorBody);
            // Si falla el webhook, dejamos pending para reintentar en el siguiente ciclo.
            continue;
          }
        }

        // 2. Marcamos como alertada para no repetir
        await pool.query('UPDATE audits SET status = $1 WHERE id = $2', ['alerted', meeting.id]);
      }
    } catch (error) {
      console.error('[Error Auditor]:', error);
    }
  }, 60000);
}


