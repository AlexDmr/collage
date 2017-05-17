/* API google key : AIzaSyA-4juoSBeUQ8bFj345dakmOtlC8Rc6SJk
 * https://panneaux-election.fr/carte/circo/073-01.kml
 */


function XHR(method, ad, params) {
    // method	: GET or POST
    // ad		: adress of the ressource to be loaded
    // params : An object containing two possible parameters.
    //		- onload	: a function taking no argument, response will be contains in object this.
    //		- variables : an object containing a set of attribute<->value
    //		- form 		: a reference to a HTML form node
    return new Promise( (resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.onload = (res) => {
            if(params && params.onload) {
                params.onload.apply(xhr, [res]);
            }
            if(xhr.status >= 200 && xhr.status <300) {
                resolve(xhr);
            } else {
                rejec(xhr);
            }
        };
        xhr.open(method, ad, true);
        if(params && !params.variables && !params.form) {
            params = {variables: params};
        }
        if(params && (params.form || params.variables)) {
            let F;
            if(params.form) F= new FormData( params.form );
            else F = new FormData();
            for(let i in params.variables) {
                F.append(i, params.variables[i]);
            }
            xhr.send( F );
        } else {xhr.send();}
    });
}



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
    document.querySelector("#numDep" ).value = localStorage.getItem("numDep" ) || 38;
    document.querySelector("#numCirc").value = localStorage.getItem("numCirc") || 1;
    document.querySelector("#login" ).value  = localStorage.getItem("login" )  || "";
    document.querySelector("#pass").value    = localStorage.getItem("pass")    || "";

    document.querySelector("#numDep" ).onchange = () => {
        localStorage.setItem("numDep", document.querySelector("#numDep" ).value);
    };
    document.querySelector("#numCirc" ).onchange = () => {
        localStorage.setItem("numCirc", document.querySelector("#numCirc" ).value);
    };
    document.querySelector("#login" ).onchange = () => {
        localStorage.setItem("login", document.querySelector("#login" ).value);
    };
    document.querySelector("#pass" ).onchange = () => {
        localStorage.setItem("pass", document.querySelector("#pass" ).value);
    };
}

function initMap() {
    console.log("Google API loaded");
}

function compute() {
    let numDep  = parseInt( document.querySelector("#numDep" ).value );
    let numCirc = parseInt( document.querySelector("#numCirc").value );

    let ressource   = "https://panneaux-election.fr/carte/circo/"
                    + ("00" + numDep ).slice (-3)
                    + "-"
                    + ("0" + numCirc).slice (-2)
                    + ".gpx";

    ressource   = "/data/"
                + ("00" + numDep ).slice (-3)
                + "-"
                + ("0" + numCirc).slice (-2)
                + ".gpx";

    console.log( `get ${ressource}` );
    XHR("GET", ressource).then(
        xhr => {
            let doc = xhr.responseXML;
            console.log( doc );
            let L = Array.from( doc.querySelectorAll("rtept") ).map( etape => ({
                lat: parseFloat( etape.getAttribute("lat") ),
                lon: parseFloat( etape.getAttribute("lon") ),
                name: etape.querySelector("name").textContent
            }));
            DisplayPath(L);

        },
        err => {
            console.error("ERROR:", err);
        }
    );
}

function DisplayPath(L) {
    let root = document.querySelector("#path");
    L.forEach( etape => {
        let section = document.createElement("section");
        section.classList.add("etape");
        section.ondblclick = () => sendToTActHab(etape);
        section.innerHTML = `
                    <section>
                        <p class="name"></p>
                        <p class="lat">LATITUDE: </p>
                        <p class="lon">LONGITUDE: </p>   
                    </section>
                    <img />
                `;
        let Nname = section.querySelector(".name");
        let Nlat  = section.querySelector(".lat");
        let Nlon  = section.querySelector(".lon");
        let Nimg  = section.querySelector("img");

        Nname.textContent = etape.name;
        Nlat.textContent += etape.lat;
        Nlon.textContent += etape.lon;

        Nimg.setAttribute(
            "src",
            `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=geo:${etape.lat},${etape.lon}`
        );
        // geo:12.34,56.78,900 (lat,lng,distance)

        root.appendChild( section );
    });
}

function sendToTActHab(etape) {
    let ad = "http://thacthab.herokuapp.com/broadcast";
    let msg = {
        login: document.querySelector("#login").value,
        pass: document.querySelector("#pass").value,
        title: "Goto",
        message: JSON.stringify({
            lat : etape.lat,
            lon : etape.lon,
            latlon: `${etape.lat},${etape.lon}`,
            name: etape.name
        })
    };
    console.log("Sending", msg);
    XHR("POST", ad, msg);
}
