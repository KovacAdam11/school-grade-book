import express from 'express';
import {authenticate} from '../service/Security.js';
const router = express.Router();

/**
 * Zobazit prihlasovaci formular
 */
router.get("/login", function (req, res) {
    res.render('user/login.html.njk');
});

/**
 * Kontrola prihlasovacich udajov a prihlasenie pouzivatela
 */
router.post("/check", async function (req, res) {
    let user = await authenticate(req.body.username, req.body.password);
    if (user) {
        await res.flash('info', 'Boli ste prihlásený.');
        req.session.user = user;
        res.redirect('/');
    } else {
        console.log('Login failed');
        await res.flash('error', 'Nesprávne meno alebo heslo.');
        res.redirect('/user/login');
    }
});

/**
 * Odhlasit pouzivatela
 */
router.get("/logout", function (req, res) {
    let sessionName = req.session.name;
    req.session.destroy(function(err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Logout OK');
            res.clearCookie(sessionName);
            res.redirect('/');
        }
    });
});


export {router as UserController}