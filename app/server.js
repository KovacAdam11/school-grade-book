import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'url';
import {initNunjucksEnv} from './service/TemplateEngine.js';
import sessions from "express-session";
import SessionFileStore from "session-file-store";
import flash from 'express-flash-message';
import {IndexController} from './controller/IndexController.js';
import {UserController} from './controller/UserController.js';
import {ArticleController} from './controller/ArticleController.js';

// Aktualny adresar
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

initNunjucksEnv(app);

const FileStore = SessionFileStore(sessions);

app.use(sessions({
    name: "moje.session.id",
    store: new FileStore({
        path: './sessions',
        retries: 0
    }),
    secret: "tajne-heslo",
    saveUninitialized: true,
    cookie: {maxAge: 1000 * 60 * 60 * 24}, // platnost cookie 1 den
    resave: true
}));

app.use(flash({
    sessionKeyName: 'express-flash-message',
}));

app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    next();
});

// staticky obsah sa bude nachadzat v podadresari public
// cize aplikacia sa najskor pozrie, ci tam neexistuje subor definvoany v URL
// adresar public moze obsahovat HTML stranky, JS subory pre klienta, CSS, obrazky, ...
app.use('/', express.static(path.join(__dirname, 'public')))

// pridame middelware aby sme mohli spracovat JSON a urlencoded requesty
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", IndexController);
app.use("/article", ArticleController);
app.use("/user", UserController);

// ak URL nezodpoveda nicomu uvedenemu zobrazi sa chybove hlasenie
app.use(function (req, res) {
    res.status(404).send(`Stránka "${req.url}" neexistuje!`);
});

// spustenie servera
app.listen(3000, () => console.log(`Server počúva na adrese: http://localhost:3000`));