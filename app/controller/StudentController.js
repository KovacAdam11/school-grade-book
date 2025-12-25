import express from 'express';
import { dbPool } from '../service/Database.js';

const router = express.Router();

/**
 * Helper – bezpečný sort
 */
function getSort(req, allowed, defaultCol) {
    const sort = allowed[req.query.sort] || defaultCol;
    const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
    return { sort, dir };
}

router.get('/', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'STUDENT') {
        return res.redirect('/user/login');
    }

    const studentId = req.session.user.id;

    const { sort, dir } = getSort(req, {
        grade_value: 'g.grade_value',
        graded_at: 'g.graded_at'
    }, 'g.graded_at');

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
        ORDER BY ${sort} ${dir}
    `, [studentId]);

    const groupedGrades = {};

    for (const g of rows) {
        if (!groupedGrades[g.subject]) {
            groupedGrades[g.subject] = [];
        }
        if (g.grade_value) {
            groupedGrades[g.subject].push(g);
        }
    }

    res.render('student/index.html.njk', {
        groupedGrades,
        sort,
        dir
    });
});


export { router as StudentController };
