import { format } from 'date-fns';
import nunjucks from 'nunjucks';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initNunjucksEnv(app) {
    // Konfiguracia sablon
    const templateEnv = nunjucks.configure('templates', {
        autoescape: true,
        noCache: process.env.NODE_ENV !== 'prod',
        express: app
    });

    templateEnv.addFilter('formatDate', function (date, dateFormat) {
        try {
            return format(date, dateFormat);
        } catch (error) {
            return 'Chybný formát dátumu: ' + date;
        }
    });

    templateEnv.addFilter('is_granted', (user, role) => {
        if (!user) return false;
        return user.role === role;
    }, false);

    templateEnv.addFilter('img_exists', (articleId) => {
        const filename = path.join(__dirname, '../public/uploads/', `${articleId}.jpg`);
        try {
            statSync(filename);
            return true;
        } catch {
            return false;
        }
    }, false);

    templateEnv.addGlobal('getFlashMessages', (type) => {
        return app.locals.flash?.[type] || [];
    });

    return templateEnv;
}

export { initNunjucksEnv };