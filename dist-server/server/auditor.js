import { pool } from '../db/index.js';
export function startMeetingAuditor() {
    console.log('--- Auditor de reuniones activado (Check cada 60s) ---');
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL || process.env.MAKE_AUDITOR_WEBHOOK_URL;
    const overdueGraceMinutes = Number(process.env.AUDITOR_OVERDUE_GRACE_MINUTES ?? '60');
    if (!makeWebhookUrl) {
        console.warn('[Auditor] MAKE_WEBHOOK_URL / MAKE_AUDITOR_WEBHOOK_URL no está configurado; solo se registrarán logs locales.');
    }
    async function sendToWebhook(meeting, accion) {
        if (!makeWebhookUrl)
            return true;
        const payload = {
            accion,
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
            status: meeting.status,
        };
        const response = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Auditor] Error enviando webhook a Make:', response.status, errorBody);
            return false;
        }
        console.log(`[Auditor] Webhook enviado a Make (accion=${accion}) para auditoria id=${String(meeting.id)}, client_id=${String(meeting.client_id ?? '')}`);
        return true;
    }
    setInterval(async () => {
        try {
            // 1. Buscamos auditorías pendientes que estén a 15 min de empezar
            const reminderQuery = `
        SELECT * FROM audits 
        WHERE status = 'pending'
        AND start_time <= now() + (reminder_minutes * interval '1 minute')
        AND start_time > now()
      `;
            const { rows: reminderRows } = await pool.query(reminderQuery);
            for (const meeting of reminderRows) {
                console.log(`[ALERTA AUDITOR]: La reunión con ${meeting.client_name} está por comenzar.`);
                const sent = await sendToWebhook(meeting, 'alerta');
                if (!sent)
                    continue;
                // 2. Marcamos como alertada para no repetir
                await pool.query('UPDATE audits SET status = $1 WHERE id = $2', ['alerted', meeting.id]);
            }
            // 3. Reuniones vencidas: ya pasó fecha_fin y el asesor no respondió.
            const overdueQuery = `
        SELECT * FROM audits
        WHERE status IN ('pending', 'alerted')
          AND advisor_status = 'pending'
          AND end_time IS NOT NULL
          AND end_time <= now() - ($1::int * interval '1 minute')
      `;
            const { rows: overdueRows } = await pool.query(overdueQuery, [overdueGraceMinutes]);
            for (const meeting of overdueRows) {
                console.log(`[AUDITOR VENCIDO]: Reunión vencida sin respuesta de asesor (${meeting.client_name}).`);
                const sent = await sendToWebhook(meeting, 'seguimiento_vencido');
                if (!sent)
                    continue;
                await pool.query('UPDATE audits SET status = $1 WHERE id = $2', ['overdue_alerted', meeting.id]);
            }
        }
        catch (error) {
            console.error('[Error Auditor]:', error);
        }
    }, 60000);
}
