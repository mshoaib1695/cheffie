function isObject(obj)
{
    return obj != null && obj.constructor.name === "Object"
}

function objectIsEmpty(obj) {
    for(var i in obj) return false; 
    return true;
}

function haversineGreatCircleDistance(lat1, lon1, lat2, lon2) {
// const lat1 = 51.5074;
// const lon1 = 0.1278;

// const lat2 =  52.5074;
// const lon2 = 0.1278;

    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // LAT, LONG in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // distance in metres
}

export { isObject, objectIsEmpty, haversineGreatCircleDistance }