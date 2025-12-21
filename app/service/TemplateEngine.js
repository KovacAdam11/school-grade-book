import {format, parse} from 'date-fns';
import nunjucks from 'nunjucks';
import { statSync } from 'fs';
import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initNunjucksEnv(app) {
    // Konfiguracia sablon
    const templateEnv = nunjucks.configure('templates', {
        autoescape: true,
        noCache: process.env.NODE_ENV !== 'prod',
        express: app
    })

    // Zaregistrovat filter pre formatovanie datumov
    templateEnv.addFilter('formatDate', function (date, dateFormat) {
        try {
            return format(date, dateFormat);
        } catch (error) {
            return 'Chybný formát dátumu: ' + date;
        }
    });

    // Custom filter pre zistovanie ake roly ma pridelene pouziatel
    templateEnv.addFilter('is_granted', (user, role) => {
        if (!user) return false;
        return user.roles ? user.roles.includes(role) : false;
    }, false);

    // Custom filter ktory zisti, ci existuje subor s definovanym nazvom v adresari public/uploads
    templateEnv.addFilter('img_exists', (articleId) => {
        let filename = path.join(__dirname, '../public/uploads/') + '/' + articleId + '.jpg';
        try {
            statSync(filename);

            return true;
        } catch {

            return false;
        }

    }, false);
}


export {initNunjucksEnv};