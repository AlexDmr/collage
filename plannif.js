let map, etapeMin=10000, etapeMax=10000, etapes = [];
let directionsService, directionsDisplay;

function initMap() {
    console.log("Map is initialized");
    map = new google.maps.Map( document.querySelector("#map"), {
        center: {lat: 45.6, lng: 5},
        zoom: 8
    } );

    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
}

function init() {
    document.querySelector("#numDep" ).value = localStorage.getItem("numDep" ) || 38;
    document.querySelector("#numCirc").value = localStorage.getItem("numCirc") || 1;

    document.querySelector("#numDep" ).onchange = () => {
        localStorage.setItem("numDep", document.querySelector("#numDep" ).value);
    };
    document.querySelector("#numCirc" ).onchange = () => {
        localStorage.setItem("numCirc", document.querySelector("#numCirc" ).value);
    };

    document.querySelector("#infoFromTo").innerText = "En attente de toutes les informations de distances...";
    document.querySelector( "#fromTo" ).onchange = () => {
        let re = /^([0-9]*)-([0-9]*)$/ig;
        let results = re.exec( document.querySelector( "#fromTo" ).value );
        etapeMin = parseInt( results[1] );
        etapeMax = parseInt( results[2] );
        console.log( "From", etapeMin, "to", etapeMax, ":", results );
        const isOut = (etape, index) => index < etapeMin-1 || index > etapeMax-1;
        let Lout = etapes.filter( isOut );
        let Lin  = etapes.filter( (e,i) => !isOut(e,i) );
        Lin.forEach(etape => {
            etape.section.classList.add( "selected" );
            etape.selected = true;
        });
        Lout.forEach(etape => {
            etape.section.classList.remove( "selected" );
            etape.selected = false;
        });
        etapes.forEach( etape => {
            console.log("yo");
            etape.marker.setIcon( {
                url     : "./" + (etape.selected?"green":"red") + ".png"
            } );
        });
        // Compute distance and time for L_in
        let distance = Lin.reduce( (acc, e) => acc+e.distanceToNext, 0);
        let duration = Lin.reduce( (acc, e) => acc+e.timeToNext, 0);
        document.querySelector("#infoFromTo").innerText = `${distance/1000}kms / ${duration/3600}h`;
    }
}


function compute() {
    let numDep  = parseInt( document.querySelector("#numDep" ).value );
    let numCirc = parseInt( document.querySelector("#numCirc").value );

    etapes.forEach( etape => {
        etape.marker.setMap(null);
    });

    let ressource   = "data/"
        + ("00" + numDep ).slice (-3)
        + "-"
        + ("0" + numCirc).slice (-2)
        + ".gpx";

    XHR("GET", ressource).then(
        xhr => {
            let doc = xhr.responseXML;
            if(doc === null) {
                let str = xhr.responseText;
                let parser = new DOMParser();
                doc = parser.parseFromString(str, "text/xml");
            }
            console.log( doc );
            etapes = Array.from( doc.querySelectorAll("rtept") ).map( etape => ({
                lat: parseFloat( etape.getAttribute("lat") ),
                lon: parseFloat( etape.getAttribute("lon") ),
                name: etape.querySelector("name").textContent,
                done: false
            })).map( e => {
                e.gmLatLng = new google.maps.LatLng({lat: e.lat, lng: e.lon});
                return e;
            });
            DisplayPath( etapes );

            // Compute distances and times
            ComputeDistances();
        },
        err => {
            console.error("ERROR:", err);
            document.querySelector("#path").innerHTML = `
                <section class="error">
                    Pas de données disponnible pour la circonscription ${numCirc} du département ${numDep}
                </section>
            `;
        }
    );}

function DisplayPath( etapes ) {
    let root = document.querySelector("#liste");
    root.textContent = "";
    etapes.forEach((etape, index) => {
        let section = etape.section = document.createElement("section");
        section.classList.add("etape");
        section.innerHTML = `
                    <p class="name"></p>
                    <p class="latlon"></p> 
                `;
        let Nname = section.querySelector(".name");
        let NLL   = section.querySelector(".latlon");
        Nname.textContent = `${index+1}: ${etape.name}`;
        NLL  .textContent = `${etape.lat},${etape.lon}`;

        // onclick
        section.onclick = () => ChangeEtapesMinMax( etapes, index );

        // Marker:
        etape.marker = new google.maps.Marker({
            position: {lat: etape.lat, lng: etape.lon},
            map: map,
            label: `${index+1}`,
            title: `${index+1}: ${etape.name}`,
            icon: {
                url     : "/" + (etape.selected?"green":"red") + ".png",
            }
        });

        // Append etape
        root.appendChild( section );
    });
}

function ComputeDistances(startIndex = 0) {
    const maxRequestPerSecond = 50;
    const maxSteps      = 23;
    const endIndex      = Math.min(startIndex+maxSteps+1, etapes.length);

    if(endIndex > startIndex) {
        let L = etapes.filter( (e, i) => i > startIndex && i < endIndex );
        directionsService.route({
                origin: etapes[startIndex].gmLatLng,
                destination: etapes[endIndex % etapes.length].gmLatLng,
                travelMode: "DRIVING",
                waypoints: L.map( etape => ({
                    location: etape.gmLatLng,
                    stopover: true
                }))
            },
            (results, status) => {
                if (status === 'OK') {
                    // directionsDisplay.setDirections(results);
                    console.log(startIndex, "to", endIndex, ":", results);
                    results.routes[0].legs.forEach( (leg, i) => {
                        let etape = etapes[startIndex + i];
                        etape.timeToNext     = leg.duration.value; // seconds
                        etape.distanceToNext = leg.distance.value; // meters
                    });
                    ComputeDistances(endIndex);
                } else {
                    console.error("ERROR in directionsService.route:", status, results);
                }
            }
        );
    } else {
        console.log("All informations retrieved for", etapes);
        document.querySelector("#infoFromTo").innerText = "OK on peut y aller!";
    }
}
































//________________________
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
                reject(xhr);
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
