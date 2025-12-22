import bcrypt from 'bcrypt';
import { dbPool } from '../service/Database.js';

const PASSWORD = 'password';

async function run() {
    const hash = await bcrypt.hash(PASSWORD, 10);

    await dbPool.execute(
        'UPDATE users SET password_hash = ?',
        [hash]
    );

    console.log('✔ Heslá nastavené pre všetkých používateľov');
    console.log('Použité heslo:', PASSWORD);

    process.exit(0);
}

run();
