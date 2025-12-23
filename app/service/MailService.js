import nodemailer from 'nodemailer';
import { format } from 'date-fns';

const transporter = nodemailer.createTransport({
    host: 'smtp',
    port: 25,
    secure: false
});

export async function sendGradeMail({
                                        to,
                                        studentName,
                                        subjectName,
                                        className,
                                        grade,
                                        note,
                                        gradedAt
                                    }) {
    const formattedDate = format(new Date(gradedAt), 'dd.MM.yyyy HH:mm');

    const text = `
Ahoj ${studentName},

bola ti pridaná nová známka.

Predmet: ${subjectName}
Trieda: ${className}
Známka: ${grade}
Dátum: ${formattedDate}
${note ? `Poznámka: ${note}` : ''}

Žiacka knižka
`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>📘 Nová známka v žiackej knižke</h2>

        <p>Ahoj <strong>${studentName}</strong>,</p>

        <p>bola ti pridaná nová známka.</p>

        <table style="border-collapse: collapse;">
            <tr>
                <td><strong>Predmet:</strong></td>
                <td>${subjectName}</td>
            </tr>
            <tr>
                <td><strong>Trieda:</strong></td>
                <td>${className}</td>
            </tr>
            <tr>
                <td><strong>Známka:</strong></td>
                <td>${grade}</td>
            </tr>
            <tr>
                <td><strong>Dátum:</strong></td>
                <td>${formattedDate}</td>
            </tr>
            ${
        note
            ? `<tr>
                           <td><strong>Poznámka:</strong></td>
                           <td>${note}</td>
                       </tr>`
            : ''
    }
        </table>

        <p style="margin-top: 20px;">
            <em>Žiacka knižka</em>
        </p>
    </div>
    `;

    await transporter.sendMail({
        from: '"Žiacka knižka" <no-reply@school.local>',
        to,
        subject: `Nová známka z predmetu ${subjectName}`,
        text,
        html
    });
}
