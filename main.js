/* API google key : AIzaSyA-4juoSBeUQ8bFj345dakmOtlC8Rc6SJk
 *
 */


let matrixNode;
let textarea;

/* MATRIX */
function computeGoogle() {
    let L = textarea.value.split("\n");

    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
        {
            origins: L,
            destinations: L,
            travelMode: 'DRIVING',
            avoidHighways: false,
            avoidTolls: false
        }, (response, status) => {
            matrixNode.textContent = response;
            console.log(status, response);
        }
    );
}

function init() {
    matrixNode  = document.querySelector("#matrix");
    textarea    = document.querySelector('#panneaux');
    textarea.value = localStorage.getItem("panneaux");
    document.querySelector("button").onclick = () => {
        localStorage.setItem("panneaux", textarea.value);
        computeGoogle();
    };
}

function initMap() {
    console.log("Google API loaded");
}
