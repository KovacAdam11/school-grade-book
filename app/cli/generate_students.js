import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { dbPool } from '../service/Database.js';

const PASSWORD = 'heslo123';
const SALT_ROUNDS = 10;

async function run() {
    console.log('➡️ Generujem žiakov...');

    // role STUDENT
    const [[studentRole]] = await dbPool.execute(
        `SELECT id FROM roles WHERE code = 'STUDENT'`
    );

    // všetky triedy
    const [classes] = await dbPool.execute(
        `SELECT id, grade_year, name_letter FROM classes`
    );

    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    for (const c of classes) {
        for (let i = 1; i <= 25; i++) {
            const username =
                `s${c.grade_year}${c.name_letter.toLowerCase()}${String(i).padStart(2, '0')}`;

            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = `${username}@school.local`;

            await dbPool.execute(
                `INSERT INTO users 
                (username, password_hash, first_name, last_name, email, role_id, class_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    username,
                    passwordHash,
                    firstName,
                    lastName,
                    email,
                    studentRole.id,
                    c.id
                ]
            );
        }
    }

    console.log('✅ Žiaci úspešne vygenerovaní');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Chyba:', err);
    process.exit(1);
});
