"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = subscribe;
var STREAM_URL = import.meta.env.VITE_STREAM_URL;
function subscribe(onEvent) {
    var es = new EventSource(STREAM_URL);
    es.onmessage = function (msg) {
        try {
            var evt = JSON.parse(msg.data);
            onEvent(evt);
        }
        catch (_a) { }
    };
    es.onerror = function () { };
    return function () { return es.close(); };
}
