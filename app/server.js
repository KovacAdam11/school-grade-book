import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'url';

import session from 'express-session';
import SessionFileStore from 'session-file-store';
import flash from 'connect-flash';

import { initNunjucksEnv } from './service/TemplateEngine.js';
import { IndexController } from './controller/IndexController.js';
import { UserController } from './controller/UserController.js';
import { StudentController } from './controller/StudentController.js';
import { TeacherController } from './controller/TeacherController.js';
import { AdminController } from './controller/AdminController.js';

// aktuálny adresár
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const FileStore = SessionFileStore(session);

// templating
initNunjucksEnv(app);

// parsovanie requestov (MUSÍ BYŤ PRED ROUTAMI!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION (IBA JEDNA)
app.use(
    session({
        name: 'ziacka.knizka.session',
        store: new FileStore({
            path: './sessions',
            retries: 0
        }),
        secret: 'tajne-heslo',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 // 1 deň
        }
    })
);

// FLASH
app.use(flash());

// sprístupnenie flash správ do templates
app.use((req, res, next) => {
    res.locals.flash = req.flash();
    next();
});

// sprístupnenie usera do templates
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// statické súbory
app.use('/', express.static(path.join(__dirname, 'public')));

// routy
app.use('/user', UserController);
app.use('/student', StudentController);
app.use('/teacher', TeacherController);
app.use('/', AdminController);
app.use('/', IndexController);

// 404
app.use((req, res) => {
    res.status(404).send(`Stránka "${req.url}" neexistuje!`);
});

// server
app.listen(3000, () =>
    console.log('Server počúva na adrese: http://localhost:3000')
);
