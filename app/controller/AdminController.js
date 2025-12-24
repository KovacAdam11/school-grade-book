import express from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../service/Database.js';

const router = express.Router();

/* =========================
   Middleware – len ADMIN
========================= */
function requireAdmin(req, res) {
    if (!req.session.user || req.session.user.role !== 'ADMIN') {
        res.redirect('/user/login');
        return false;
    }
    return true;
}

/* =========================
   ADMIN – dashboard
   URL: /admin
========================= */
router.get('/', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [users] = await dbPool.execute(`
        SELECT
            u.id,
            u.username,
            u.first_name,
            u.last_name,
            r.code AS role,
            c.grade_year,
            c.name_letter
        FROM users u
                 JOIN roles r ON r.id = u.role_id
                 LEFT JOIN classes c ON c.id = u.class_id
        ORDER BY r.code, u.username
    `);

    res.render('admin/users.html.njk', { users });
});

/* =========================
   CREATE USER – FORM
========================= */
router.get('/user/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [roles] = await dbPool.execute(`SELECT * FROM roles`);
    const [classes] = await dbPool.execute(`SELECT * FROM classes`);

    res.render('admin/create_user.html.njk', { roles, classes });
});

/* =========================
   CREATE USER – SAVE
========================= */
router.post('/user/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const {
        username,
        password,
        first_name,
        last_name,
        email,
        role_id,
        class_id
    } = req.body;

    const emailValue = email && email.trim() !== '' ? email : null;
    const passwordHash = await bcrypt.hash(password, 10);

    await dbPool.execute(`
        INSERT INTO users
        (username, password_hash, first_name, last_name, email, role_id, class_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        username,
        passwordHash,
        first_name,
        last_name,
        emailValue,
        role_id,
        class_id || null
    ]);

    res.redirect('/admin');
});

/* =========================
   EDIT USER – FORM
========================= */
router.get('/user/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [[user]] = await dbPool.execute(
        `SELECT * FROM users WHERE id = ?`,
        [req.params.id]
    );

    const [roles] = await dbPool.execute(`SELECT * FROM roles`);
    const [classes] = await dbPool.execute(`SELECT * FROM classes`);

    res.render('admin/edit_user.html.njk', { user, roles, classes });
});

/* =========================
   EDIT USER – SAVE
========================= */
router.post('/user/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { first_name, last_name, role_id, class_id } = req.body;

    await dbPool.execute(`
        UPDATE users
        SET first_name = ?, last_name = ?, role_id = ?, class_id = ?
        WHERE id = ?
    `, [
        first_name,
        last_name,
        role_id,
        class_id || null,
        req.params.id
    ]);

    res.redirect('/admin');
});

/* =========================
   DELETE USER – SAFE
========================= */
router.post('/user/:id/delete', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);

    const [[user]] = await dbPool.execute(`
        SELECT r.code AS role
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?
    `, [userId]);

    if (!user) {
        req.flash('error', 'Používateľ neexistuje.');
        return res.redirect('/admin');
    }

    if (user.role === 'ADMIN') {
        req.flash('error', 'Administrátora nie je možné zmazať.');
        return res.redirect('/admin');
    }

    if (user.role === 'TEACHER') {
        const [[row]] = await dbPool.execute(`
            SELECT COUNT(*) AS cnt FROM class_subjects WHERE teacher_id = ?
        `, [userId]);

        if (row.cnt > 0) {
            req.flash('error', 'Učiteľ má priradené predmety.');
            return res.redirect('/admin');
        }
    }

    if (user.role === 'STUDENT') {
        const [[row]] = await dbPool.execute(`
            SELECT COUNT(*) AS cnt FROM enrollments WHERE student_id = ?
        `, [userId]);

        if (row.cnt > 0) {
            req.flash('error', 'Žiak je zapísaný na predmety.');
            return res.redirect('/admin');
        }
    }

    await dbPool.execute(`DELETE FROM users WHERE id = ?`, [userId]);
    req.flash('success', 'Používateľ bol zmazaný.');
    res.redirect('/admin');
});

/* =========================
   ADMIN – CLASSES
========================= */
router.get('/classes', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [classes] = await dbPool.execute(`
        SELECT
            c.id,
            c.grade_year,
            c.name_letter,
            COUNT(u.id) AS student_count
        FROM classes c
        LEFT JOIN users u
          ON u.class_id = c.id
         AND u.role_id = (SELECT id FROM roles WHERE code='STUDENT')
        GROUP BY c.id
        ORDER BY c.grade_year, c.name_letter
    `);

    res.render('admin/classes.html.njk', { classes });
});

export { router as AdminController };
