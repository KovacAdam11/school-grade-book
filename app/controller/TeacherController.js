import express from 'express';
import { dbPool } from '../service/Database.js';
import { sendGradeMail } from '../service/MailService.js';

const router = express.Router();

function requireTeacher(req, res) {
    if (!req.session.user || req.session.user.role !== 'TEACHER') {
        res.redirect('/user/login');
        return false;
    }
    return true;
}

/**
 * Teacher dashboard – moje predmety
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
        `,
        [teacherId]
    );

    res.render('teacher/dashboard.html.njk', {
        subjects: rows
    });
});

/**
 * História známok pre jedného žiaka (enrollment)
 */
router.get('/enrollment/:id/grades', async (req, res) => {
    if (!requireTeacher(req, res)) return;

    const enrollmentId = Number(req.params.id);



    const [grades] = await dbPool.execute(
        `
            SELECT grade_value, graded_at, note
            FROM grades
            WHERE enrollment_id = ?
        `,
        [enrollmentId]
    );

    res.render('teacher/grades_history.html.njk', {
        grades
    });
});

/**
 * Zobraziť žiakov pre konkrétny predmet v triede
 */
router.get('/class-subject/:id', async (req, res) => {
    if (!requireTeacher(req, res)) return;

    const teacherId = req.session.user.id;
    const classSubjectId = Number(req.params.id);

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

    const [students] = await dbPool.execute(
        `
            SELECT
                e.id AS enrollment_id,
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
        `,
        [classSubjectId]
    );

    res.render('teacher/class_subject.html.njk', {
        classSubject: cs,
        students,
    });
});

/**
 * Pridať známku + poslať email
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
        await dbPool.execute(
            `
                INSERT INTO grades (enrollment_id, teacher_id, grade_value, note)
                VALUES (?, ?, ?, ?)
            `,
            [enrollmentId, teacherId, gradeValue, note || null]
        );

        const [[info]] = await dbPool.execute(
            `
                SELECT
                    u.email,
                    CONCAT(u.first_name, ' ', u.last_name) AS student_name,
                    s.name AS subject_name,
                    CONCAT(c.grade_year, '.', c.name_letter) AS class_name,
                    NOW() AS graded_at
                FROM enrollments e
                         JOIN users u ON u.id = e.student_id
                         JOIN class_subjects cs ON cs.id = e.class_subject_id
                         JOIN classes c ON c.id = cs.class_id
                         JOIN subjects s ON s.id = cs.subject_id
                WHERE e.id = ?
            `,
            [enrollmentId]
        );

        if (info?.email) {
            await sendGradeMail({
                to: info.email,
                studentName: info.student_name,
                subjectName: info.subject_name,
                className: info.class_name,
                grade: gradeValue,
                note,
                gradedAt: info.graded_at
            });
        }

        req.flash('success', 'Známka bola pridaná a email odoslaný.');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Nepodarilo sa pridať známku alebo odoslať email.');
    }

    return res.redirect('back');
});

export { router as TeacherController };
