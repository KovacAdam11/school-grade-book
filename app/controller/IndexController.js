import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    const role = req.session.user.role;

    if (role === 'ADMIN') return res.redirect('/admin');
    if (role === 'TEACHER') return res.redirect('/teacher');
    if (role === 'STUDENT') return res.redirect('/student');

    res.send('Neznáma rola');
});

export { router as IndexController };
