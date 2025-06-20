/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";

// Configurações do Gmail (em produção, use variáveis de ambiente)
const GMAIL_CONFIG = {
  user: "paulo1714silva@gmail.com",
  pass: "sgam nibf igdz yjwh"
};

// Função de envio de email
export const sendEmailV2 = functions.https.onCall(async (request, context) => {
  try {
    // Importação dinâmica do nodemailer
    const nodemailer = await import("nodemailer");
    
    const {to, subject, text, html} = request.data;
    
    // Validação dos dados
    if (!to || !subject) {
      return {
        success: false,
        error: "Email e assunto são obrigatórios"
      };
    }

    // Configuração do transporte
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_CONFIG.user,
        pass: GMAIL_CONFIG.pass,
      },
    });

    const mailOptions = {
      from: GMAIL_CONFIG.user,
      to,
      subject,
      text: text || "",
      html: html || "",
    };

    await transporter.sendMail(mailOptions);
    return {success: true};
    
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// Error: spawn npm --prefix "%RESOURCE_DIR%" run lint ENOENT
