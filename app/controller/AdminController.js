import express from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../service/Database.js';

const router = express.Router();

/**
 * ADMIN – zoznam používateľov
 */
router.get('/admin', async (req, res) => {
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
        ORDER BY u.id
    `);

    res.render('admin/users.html.njk', { users });
});

/**
 * ADMIN – formulár na vytvorenie používateľa
 */
router.get('/admin/user/create', async (req, res) => {
    const [roles] = await dbPool.execute(`SELECT * FROM roles`);
    const [classes] = await dbPool.execute(`SELECT * FROM classes`);

    res.render('admin/create_user.html.njk', { roles, classes });
});

// Prehľad tried
router.get('/classes', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') {
        return res.redirect('/user/login');
    }

    const [rows] = await dbPool.execute(`
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

    res.render('admin/classes.html.njk', {
        classes: rows
    });
});

// Admin dashboard
// Admin – zoznam používateľov (hlavná admin stránka)
router.get('/', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') {
        return res.redirect('/user/login');
    }

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

    res.render('admin/users.html.njk', {
        users
    });
});


/**
 * ADMIN – uloženie používateľa
 */
router.post('/admin/user/create', async (req, res) => {
    const {
        username,
        password,
        first_name,
        last_name,
        email,
        role_id,
        class_id
    } = req.body;

    // 🔐 HASH HESLA – KĽÚČOVÁ ČASŤ
    const passwordHash = await bcrypt.hash(password, 10);

    await dbPool.execute(
        `
            INSERT INTO users
            (username, password_hash, first_name, last_name, email, role_id, class_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            username,
            passwordHash,
            first_name,
            last_name,
            email,
            role_id,
            class_id || null
        ]
    );

    res.redirect('/admin');
});

export { router as AdminController };
