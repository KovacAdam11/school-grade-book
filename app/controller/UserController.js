import express from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../service/Database.js';

const router = express.Router();

/**
 * Login formulár
 */
router.get('/login', (req, res) => {
    res.render('user/login.html.njk');
});

/**
 * Spracovanie loginu
 */
router.post('/login', async (req, res) => {
    console.log('LOGIN BODY:', req.body);

    const { username, password } = req.body;

    const [rows] = await dbPool.execute(
        `SELECT u.id, u.username, u.password_hash, r.code AS role
         FROM users u
                  JOIN roles r ON r.id = u.role_id
         WHERE u.username = ?`,
        [username]
    );

    if (rows.length === 0) {
        req.flash('error', 'Nesprávne meno alebo heslo');
        return res.redirect('/user/login');
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
        req.flash('error', 'Nesprávne meno alebo heslo');
        return res.redirect('/user/login');
    }

    // uloženie do session
    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
    };

    req.session.save(() => {
        if (user.role === 'ADMIN') return res.redirect('/admin');
        if (user.role === 'TEACHER') return res.redirect('/teacher');
        if (user.role === 'STUDENT') return res.redirect('/student');

        res.redirect('/');
    });
});


/**
 * Logout
 */
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/user/login');
    });
});

export { router as UserController };
