/**
 * Nacitat spravy zo servera a zobrazit ich na obrazovke
 */
function readMessages() {
    let display = document.getElementById("chat-display");
    let username = document.getElementById("username").value;

    fetch(
        '/api/messages',
        {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            },
        }).then(res => res.json()).then(response => {
        console.log(response);

        // vymazat stare spravy
        let displayHTML = "";

        for (let i = 0; i < response.length; i++) {
            displayHTML += "<div class='row'>"
            // rozhodnem ci zarovnat doprava alebo dolava
            let offset = (username === response[i].username) ? 'offset-6' : '';
            let bgColor = (username === response[i].username) ? 'success' : 'primary';

            displayHTML += `
                   <div class="col-6 ${offset}">
                        <div class="card bg-${bgColor} text-white mb-2 ">
                            <div class="card-header">
                                <small>
                                    <div class="float-start">${response[i].username}</div>
                                    <div class="float-end">${response[i].time}</div>
                                </small>
                            </div>
                            <div class="card-body">${response[i].message}</div>                
                        </div>
                    </div>
                `;
            displayHTML += '</div>';
        }

        display.innerHTML = displayHTML;
        // preskrolujem obsah okna na poslednu spravu
        display.scrollTop = display.scrollHeight;
        // Funkcia sa opat zavola o 2 sekundy
        setTimeout(readMessages, 2000);
    });
}

function postMessage() {
    let username = document.getElementById('username').value;
    let message = document.getElementById('message').value;

    fetch(
        '/api/messages',
        {
            method: 'POST',
            body: JSON.stringify(
                {
                    username: username,
                    message: message
                }
            ),
            headers: {
                "Content-Type": "application/json",
            },
        }).then(res => res.json()).then(response => {
        console.log(response);
        readMessages();
        // vymazat zadavaci riadok
        document.getElementById('message').value = '';
    });
}

window.onload = () => {
    let btnSend = document.getElementById('btn-send');
    let inputMessage = document.getElementById('message');

    // nacitat ulozene spravy
    readMessages();

    // obsluha kliknutia na tlacidlo
    btnSend.addEventListener('click', postMessage);

    // obsluha stlacenia klavesy enter
    inputMessage.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            postMessage();
        }
    });
};