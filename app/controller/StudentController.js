import express from 'express';
import { dbPool } from '../service/Database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    // ochrana – len prihlásený študent
    if (!req.session.user || req.session.user.role !== 'STUDENT') {
        return res.redirect('/user/login');
    }

    const studentId = req.session.user.id;

    const [rows] = await dbPool.execute(`
        SELECT
            sub.name AS subject,
            g.grade_value,
            g.graded_at,
            g.note
        FROM enrollments e
                 JOIN class_subjects cs ON cs.id = e.class_subject_id
                 JOIN subjects sub ON sub.id = cs.subject_id
                 LEFT JOIN grades g ON g.enrollment_id = e.id
        WHERE e.student_id = ?
        ORDER BY sub.name, g.graded_at
    `, [req.session.user.id]);

    res.render('student/index.html.njk', {
        grades: rows
    });
});

export { router as StudentController };
