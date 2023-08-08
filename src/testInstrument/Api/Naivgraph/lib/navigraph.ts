import { initializeApp, Scope, NavigraphApp } from "@navigraph/app";
import { getAuth } from "@navigraph/auth";
import { getChartsAPI } from "@navigraph/charts";

const config: NavigraphApp = {
    clientId: '',
    clientSecret: '',
    scopes: [Scope.CHARTS, Scope.OFFLINE, Scope.FMSDATA]
};

initializeApp(config);

export const auth = getAuth({
    storage: { // Optional
        getItem: (key) => localStorage.getItem("NG" + key),
        setItem: (key, value) => localStorage.setItem("NG" + key, value),
    },
});

export const charts = getChartsAPI();
