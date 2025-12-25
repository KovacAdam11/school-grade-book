import express from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../service/Database.js';

const router = express.Router();

/* =========================
   Middleware – len ADMIN
========================= */
function requireAdmin(req, res) {
    if (!req.session.user || req.session.user.role !== 'ADMIN') {
        return res.redirect('/user/login');
    }
    return true;
}

/* =========================
   ADMIN – dashboard (users)
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
   URL: /admin/user/create
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

    req.flash('success', 'Používateľ bol vytvorený.');
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

    req.flash('success', 'Používateľ bol upravený.');
    res.redirect('/admin');
});

router.get('/classes/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    res.render('admin/class_create.html.njk');
});

router.post('/classes/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { grade_year, name_letter } = req.body;

    if (!grade_year || !name_letter) {
        req.flash('error', 'Vyplň ročník aj označenie triedy.');
        return res.redirect('/admin/classes/create');
    }

    await dbPool.execute(`
        INSERT INTO classes (grade_year, name_letter)
        VALUES (?, ?)
    `, [grade_year, name_letter]);

    req.flash('success', 'Trieda bola vytvorená.');
    res.redirect('/admin/classes');
});

router.get('/classes/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [[classItem]] = await dbPool.execute(`
        SELECT * FROM classes WHERE id = ?
    `, [req.params.id]);

    if (!classItem) {
        req.flash('error', 'Trieda neexistuje.');
        return res.redirect('/admin/classes');
    }

    res.render('admin/class_edit.html.njk', { classItem });
});

router.post('/classes/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { grade_year, name_letter } = req.body;

    await dbPool.execute(`
        UPDATE classes
        SET grade_year = ?, name_letter = ?
        WHERE id = ?
    `, [grade_year, name_letter, req.params.id]);

    req.flash('success', 'Trieda bola upravená.');
    res.redirect('/admin/classes');
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
        const [[row]] = await dbPool.execute(
            `SELECT COUNT(*) AS cnt FROM class_subjects WHERE teacher_id = ?`,
            [userId]
        );
        if (row.cnt > 0) {
            req.flash('error', 'Učiteľ má priradené predmety.');
            return res.redirect('/admin');
        }
    }

    if (user.role === 'STUDENT') {
        const [[row]] = await dbPool.execute(
            `SELECT COUNT(*) AS cnt FROM enrollments WHERE student_id = ?`,
            [userId]
        );
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
   URL: /admin/classes
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

/* =========================
   ADMIN – CLASS SUBJECTS
   URL: /admin/class-subjects
========================= */
router.get('/class-subjects', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const [classSubjects] = await dbPool.execute(`
        SELECT
            cs.id,
            CONCAT(c.grade_year, '.', c.name_letter) AS class_name,
            s.name AS subject_name,
            CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
        FROM class_subjects cs
                 JOIN classes c ON c.id = cs.class_id
                 JOIN subjects s ON s.id = cs.subject_id
                 JOIN users u ON u.id = cs.teacher_id
        ORDER BY c.grade_year, c.name_letter, s.name
    `);

    const [classes] = await dbPool.execute(`SELECT * FROM classes`);
    const [subjects] = await dbPool.execute(`SELECT * FROM subjects`);
    const [teachers] = await dbPool.execute(`
        SELECT id, first_name, last_name
        FROM users
        WHERE role_id = (SELECT id FROM roles WHERE code='TEACHER')
    `);

    res.render('admin/class_subjects.html.njk', {
        classSubjects,
        classes,
        subjects,
        teachers
    });
});

/* =========================
   SUBJECT DETAILS (MODAL)
   URL: /admin/subjects/:id/details
========================= */
router.get('/subjects/:id/details', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') {
        return res.status(403).json([]);
    }

    const subjectId = req.params.id;

    const [rows] = await dbPool.execute(`
        SELECT
            CONCAT(c.grade_year, '.', c.name_letter) AS class_name,
            CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
            (
                SELECT COUNT(*)
                FROM enrollments e
                WHERE e.class_subject_id = cs.id
            ) AS student_count
        FROM class_subjects cs
                 JOIN classes c ON c.id = cs.class_id
                 JOIN users u ON u.id = cs.teacher_id
        WHERE cs.subject_id = ?
        ORDER BY c.grade_year, c.name_letter
    `, [subjectId]);

    res.json(rows);
});

router.post('/subjects/:id/clear-assignments', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const subjectId = req.params.id;

    await dbPool.execute(`
        DELETE FROM class_subjects
        WHERE subject_id = ?
    `, [subjectId]);

    res.json({ ok: true });
});

router.post('/subjects/:id/clear-enrollments', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const subjectId = req.params.id;

    await dbPool.execute(`
        DELETE e
        FROM enrollments e
        JOIN class_subjects cs ON cs.id = e.class_subject_id
        WHERE cs.subject_id = ?
    `, [subjectId]);

    res.json({ ok: true });
});

router.post('/class-subjects/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { teacher_id } = req.body;

    await dbPool.execute(`
        UPDATE class_subjects
        SET teacher_id = ?
        WHERE id = ?
    `, [teacher_id, req.params.id]);

    req.flash('success', 'Priradenie bolo upravené.');
    res.redirect('/admin/class-subjects');
});

router.post('/class-subjects/:id/delete', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const csId = Number(req.params.id);

    //Skontroluj, či existujú zápisy žiakov
    const [[row]] = await dbPool.execute(`
        SELECT COUNT(*) AS cnt
        FROM enrollments
        WHERE class_subject_id = ?
    `, [csId]);

    if (row.cnt > 0) {
        req.flash(
            'error',
            'Toto priradenie nie je možné zmazať – existujú zapísaní žiaci.'
        );
        return res.redirect('/admin/class-subjects');
    }

    //Zmazanie je bezpečné
    await dbPool.execute(`
        DELETE FROM class_subjects
        WHERE id = ?
    `, [csId]);

    req.flash('success', 'Priradenie bolo zmazané.');
    res.redirect('/admin/class-subjects');
});

/* =========================
   ADMIN – SAVE CLASS SUBJECT
========================= */
router.post('/class-subjects', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { class_id, subject_id, teacher_id } = req.body;

    await dbPool.execute(`
        INSERT INTO class_subjects (class_id, subject_id, teacher_id)
        VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)
    `, [class_id, subject_id, teacher_id]);

    req.flash('success', 'Priradenie bolo uložené.');
    res.redirect('/admin/class-subjects');
});

/* =========================
   ADMIN – SUBJECTS
   URL: /admin/subjects
========================= */
router.get('/subjects', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const sort = req.query.sort || 'name';
    const dir = req.query.dir === 'DESC' ? 'DESC' : 'ASC';

    const [subjects] = await dbPool.execute(`
        SELECT
            s.id,
            s.name,
            (
                SELECT COUNT(*)
                FROM class_subjects cs
                WHERE cs.subject_id = s.id
            ) AS usage_count
        FROM subjects s
        ORDER BY s.name
    `);

    res.render('admin/subjects.html.njk', {
        subjects,
        sort,
        dir
    });
});


/* =========================
   CREATE SUBJECT
========================= */
router.post('/subjects/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { name } = req.body;

    if (!name || name.trim() === '') {
        req.flash('error', 'Názov predmetu nemôže byť prázdny.');
        return res.redirect('/admin/subjects');
    }

    await dbPool.execute(
        `INSERT INTO subjects (name) VALUES (?)`,
        [name.trim()]
    );

    req.flash('success', 'Predmet bol vytvorený.');
    res.redirect('/admin/subjects');
});

/* =========================
   EDIT SUBJECT
========================= */
router.post('/subjects/:id/edit', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { name } = req.body;

    await dbPool.execute(`
        UPDATE subjects
        SET name = ?
        WHERE id = ?
    `, [name.trim(), req.params.id]);

    req.flash('success', 'Predmet bol upravený.');
    res.redirect('/admin/subjects');
});

/* =========================
   DELETE SUBJECT – SAFE
========================= */
router.post('/subjects/:id/delete', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const subjectId = req.params.id;

    const [[row]] = await dbPool.execute(`
        SELECT COUNT(*) AS cnt
        FROM class_subjects
        WHERE subject_id = ?
    `, [subjectId]);

    if (row.cnt > 0) {
        req.flash(
            'error',
            'Predmet nie je možné zmazať – je priradený k triedam.'
        );
        return res.redirect('/admin/subjects');
    }

    await dbPool.execute(
        `DELETE FROM subjects WHERE id = ?`,
        [subjectId]
    );

    req.flash('success', 'Predmet bol zmazaný.');
    res.redirect('/admin/subjects');
});

export { router as AdminController };
