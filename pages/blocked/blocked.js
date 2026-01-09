let timeSinceRedirect;

window.addEventListener("load", (async () => {
    chrome.runtime.sendMessage(
        "nfpgjkacnomfnenmgdghljglpiefneho",
        { type: "GET_REDIRECT_TIME"},
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }

            document.getElementById("timer").innerHTML = parseInt(Date.now() / 1000) - parseInt(response.data / 1000);
            timeSinceRedirect = parseInt(response.data / 1000);
            console.log("Value from extension:", response.data);
        }
    );

    window.setInterval(() => {
        const el = document.getElementById("timer");
        el.innerHTML = (parseInt(Date.now() / 1000)) - timeSinceRedirect;

        // if (el.innerHTML == 60) {
            
        // }
    }, 1000)
}));
