import * as Security from '../service/Security.js';
import dotenv from 'dotenv';

// tento prikaz nacita premenne zo suboru .env a spristupni ich cez process.env
dotenv.config();

// Do pola args sa ulozia argumenty z prikazoveho riadku bez prvych dvoch retazcov "node" a "set_password.js"
const args = process.argv.slice(2);

// Kontrola ci pouzivatel zadal spravny pocet argumentov
if (args.length !== 2) {
    console.log('Pouzitie: set_password meno_pouzivatela heslo.')
    process.exit(-1);
} else {
    // prvky pola args sa ulozia do premennych "username" a "password".
    let [username, password] = args;

    // Zavolat funkciu z modulu Security pre nastavenie hesla.
    Security.setUserPassword(username, password).then((r) => {
        console.log('Heslo bolo nastavene.');
        process.exit(0);
    });
}
