import express from 'express';
import { dbPool } from '../service/Database.js';

const router = express.Router();

function requireTeacher(req, res) {
    if (!req.session.user || req.session.user.role !== 'TEACHER') {
        res.redirect('/user/login');
        return false;
    }
    return true;
}

/**
 * Teacher dashboard
 */
router.get('/', async (req, res) => {
    if (!requireTeacher(req, res)) return;

    const teacherId = req.session.user.id;

    const [rows] = await dbPool.execute(
        `
            SELECT
                cs.id AS class_subject_id,
                c.grade_year,
                c.name_letter,
                s.name AS subject_name
            FROM class_subjects cs
                     JOIN classes c ON c.id = cs.class_id
                     JOIN subjects s ON s.id = cs.subject_id
            WHERE cs.teacher_id = ?
            ORDER BY c.grade_year, c.name_letter, s.name
        `,
        [teacherId]
    );

    res.render('teacher/dashboard.html.njk', {
        items: rows
    });
});

/**
 * Zobraziť žiakov pre konkrétny predmet v konkrétnej triede (class_subject)
 */
router.get('/class-subject/:id', async (req, res) => {
    if (!requireTeacher(req, res)) return;

    const teacherId = req.session.user.id;
    const classSubjectId = Number(req.params.id);

    // Over, že tento class_subject patrí tomuto učiteľovi + vytiahni info o triede/predmete
    const [[cs]] = await dbPool.execute(
        `
        SELECT
            cs.id,
            cs.teacher_id,
            c.grade_year,
            c.name_letter,
            s.name AS subject_name
        FROM class_subjects cs
        JOIN classes c ON c.id = cs.class_id
        JOIN subjects s ON s.id = cs.subject_id
        WHERE cs.id = ?
        `,
        [classSubjectId]
    );

    if (!cs || cs.teacher_id !== teacherId) {
        req.flash('error', 'Nemáš prístup k tomuto predmetu/triede.');
        return res.redirect('/teacher');
    }

    // Zoznam žiakov prihlásených na tento predmet (enrollments)
    const [students] = await dbPool.execute(
        `
        SELECT
            e.id AS enrollment_id,
            u.id AS student_id,
            u.first_name,
            u.last_name,
            (
              SELECT g.grade_value
              FROM grades g
              WHERE g.enrollment_id = e.id
              ORDER BY g.graded_at DESC, g.id DESC
              LIMIT 1
            ) AS last_grade,
            (
              SELECT g.graded_at
              FROM grades g
              WHERE g.enrollment_id = e.id
              ORDER BY g.graded_at DESC, g.id DESC
              LIMIT 1
            ) AS last_graded_at
        FROM enrollments e
        JOIN users u ON u.id = e.student_id
        WHERE e.class_subject_id = ?
        ORDER BY u.last_name, u.first_name
        `,
        [classSubjectId]
    );

    res.render('teacher/class_subject.html.njk', {
        classSubject: cs,
        students
    });
});

/**
 * Pridať známku (len učiteľ)
 * Body: enrollment_id, grade_value, note
 */
router.post('/grade/add', async (req, res) => {
    if (!requireTeacher(req, res)) return;

    const teacherId = req.session.user.id;
    const enrollmentId = Number(req.body.enrollment_id);
    const gradeValue = Number(req.body.grade_value);
    const note = (req.body.note || '').trim();

    if (!enrollmentId || !Number.isInteger(gradeValue) || gradeValue < 1 || gradeValue > 5) {
        req.flash('error', 'Neplatné údaje. Známka musí byť 1–5.');
        return res.redirect('back');
    }

    try {
        // Insert – DB trigger kontroluje, že enrollment patrí k subjectu učiteľa
        await dbPool.execute(
            `
            INSERT INTO grades (enrollment_id, teacher_id, grade_value, note)
            VALUES (?, ?, ?, ?)
            `,
            [enrollmentId, teacherId, gradeValue, note || null]
        );

        req.flash('success', 'Známka bola pridaná.');
    } catch (err) {
        req.flash('error', err?.message || 'Nepodarilo sa pridať známku.');
    }

    return res.redirect('back');
});

export { router as TeacherController };
