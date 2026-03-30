import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}

const FROM = process.env.EMAIL_FROM ?? "eZMacro <noreply@ezmacro.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendWelcomeEmail(to: string, name?: string) {
  const displayName = name ?? to.split("@")[0];

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Bienvenido a eZMacro 🥑",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;max-width:560px;width:100%">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:32px 40px;text-align:center">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">eZMacro</p>
              <p style="margin:8px 0 0;font-size:14px;color:#a7f3d0">Nutrición de precisión con IA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px">
              <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f9fafb">¡Hola, ${displayName}! 👋</p>
              <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6">
                Tu cuenta en eZMacro está lista. Ya puedes empezar a rastrear tus macros con precisión y usar el análisis de comidas con IA.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6">
                Completa tu perfil para obtener tus metas calóricas personalizadas basadas en tu TDEE y objetivos.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
                <tr>
                  <td style="background:#059669;border-radius:8px">
                    <a href="${APP_URL}/dashboard" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">
                      Ir al dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px;background:#111827;border-radius:8px;margin-bottom:8px">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb">📸 Analiza comidas con foto</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">GPT-4 Vision estima macros automáticamente</p>
                  </td>
                </tr>
                <tr><td style="height:8px"></td></tr>
                <tr>
                  <td style="padding:16px;background:#111827;border-radius:8px;margin-bottom:8px">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb">🧮 Cálculo científico de TDEE</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Ecuación Mifflin-St Jeor con ajuste por objetivo</p>
                  </td>
                </tr>
                <tr><td style="height:8px"></td></tr>
                <tr>
                  <td style="padding:16px;background:#111827;border-radius:8px">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#f9fafb">📊 Analytics semanales</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Seguimiento de tendencias y adherencia a metas</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #374151;text-align:center">
              <p style="margin:0;font-size:12px;color:#4b5563">
                Recibiste este email porque te registraste en eZMacro.<br>
                Si no fuiste tú, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Restablecer contraseña — eZMacro",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;max-width:560px;width:100%">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:32px 40px;text-align:center">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">eZMacro</p>
              <p style="margin:8px 0 0;font-size:14px;color:#a7f3d0">Nutrición de precisión con IA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f9fafb">Restablecer contraseña</p>
              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Haz clic en el botón para crear una nueva contraseña.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
                <tr>
                  <td style="background:#059669;border-radius:8px">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">
                      Restablecer contraseña →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
                O copia este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#4b5563;word-break:break-all;background:#111827;padding:12px;border-radius:6px">
                ${resetUrl}
              </p>
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
                ⏱ Este enlace expira en <strong style="color:#f9fafb">1 hora</strong>.<br>
                Si no solicitaste esto, puedes ignorar este email — tu contraseña no cambiará.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #374151;text-align:center">
              <p style="margin:0;font-size:12px;color:#4b5563">
                Por seguridad, nunca compartimos tu contraseña por email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
