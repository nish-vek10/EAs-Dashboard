"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroup = getGroup;
exports.setGroup = setGroup;
var KEY = "eas.accountGroups";
function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "{}");
    }
    catch (_a) {
        return {};
    }
}
function write(map) {
    localStorage.setItem(KEY, JSON.stringify(map));
}
function getGroup(login_hint) {
    var m = read();
    return m[login_hint] || "All";
}
function setGroup(login_hint, group) {
    var m = read();
    if (group === "All")
        delete m[login_hint];
    else
        m[login_hint] = group;
    write(m);
}
