import express from 'express';

const router = express.Router();

/**
 * Úvodná stránka aplikácie
 * (dočasná – neskôr tu bude presmerovanie podľa roly)
 */
router.get('/', (req, res) => {
    res.send('Index controller funguje – žiacka knižka beží');
});

export { router as IndexController };
