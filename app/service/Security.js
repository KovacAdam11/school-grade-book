import * as Db from './Database.js';
import argon2 from 'argon2';

/**
 * Middleware pre overovanie pristupu na zaklade rol pouzivatela
 *
 * @param permittedRoles Zoznam rol, ktore maju pristup ku konkretnej akcii (route)
 * @returns {(function(*, *, *): void)|*}
 */
function authorize(...permittedRoles) {
    // funkcia vracia Express middleware
    return (req, res, next) => {
        const user = req.session.user;

        // ak pouzivatel v session existuje (je prihlaseny)
        if (user) {
            // Prejdem vsetky roly, ktore maju povoleny pristup a zistujem, ci ich ma pouzivatel pridelene
            // ak ma pridelenu aspon jednu rolu, tak je pristup povoleny
            let accessGranted = permittedRoles.some((permittedRole) => {
                console.log(permittedRole, user.roles, user.roles.includes(permittedRole));
                return user.roles.includes(permittedRole);
            });

            if (accessGranted) {
                // pouzivatel ma pozadovanu rolu, spracovanie poziadavky moze teda pokracovat
                next();
            } else {
                res.flash('error', 'Pokus o neoprávnený prístup!');
                res.redirect('/'); // navrat na uvodnu stranku
            }
        } else {
            res.flash('error', 'Prístup len pre prihlásených používateľov!');
            res.redirect('/'); // navrat na uvodnu stranku
        }
    }
}

/**
 * Overenie prihlasovacich udajov pouzivatela a nacitanie dalsich detailov z DB.
 * @param username
 * @param password
 * @returns {Promise<User>}
 */
async function authenticate(username, password) {
    // vytiahnem z databazy pouzivatela
    let dbUsers = await Db.query('SELECT * FROM users WHERE username = :user', {
        user: username
    });

    // ak sa pouzivatel nenasiel overenie je neuspesne
    if (dbUsers.length !== 1) {
        console.log(`Pouzivatel ${username} sa nenasiel.`);
        return null;
    }

    // kedze vysledkom volania db.query je pole vytiahnem z neho jeden (jediny) prvok, ktorym je objekt s informaciami
    // o pouzivatelovi. Jeho struktura zodpoveda strukture tabulky (kedze sme v selecte pouzili *).
    let dbUser = dbUsers.pop();

    let passOK = await argon2.verify(dbUser.password, password);
    // ak sa hash hesla v DB nezhodujes s hashom zadaneho hesla, tak je overenie neuspesne
    if (!passOK) {
        console.log(dbUser.password ,password );
        return null;
    }

    // roly su v db ulozene ako retazec. Tu ich rozdelim podla znaku ciarka a dalej s nimi budem pracovat ako s polom.
    dbUser.roles = dbUser.roles.split(',');

    return dbUser;
}

/**
 * Vypocitat hash zadaneho hesla.
 *
 * Pri hashovani sa pouziva aj SALT definovany v konfiguracii.
 *
 * @param password
 */
async function hashPassword(password) {
    // Vypocitat hash algoritmom argon2.
    return await argon2.hash(password);
}

/**
 * Nastavit nove heslo pre pouzivatela.
 *
 * @param username
 * @param password
 * @returns {Promise<void>}
 */
async function setUserPassword(username, password) {
    await Db.query('UPDATE users SET password = :pwd WHERE username = :username', {
        pwd: await hashPassword(password),
        username: username
    });
}

export {authorize, authenticate, setUserPassword}