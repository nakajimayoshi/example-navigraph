import pkce from "@navigraph/pkce";

export enum Endpoints {
    AUTHORIZATION = 'https://identity.api.navigraph.com/connect/deviceauthorization/',
    TOKEN = 'https://identity.api.navigraph.com/connect/token/'
}

export enum GrantType {
    DEVICE_CODE = 'urn:ietf:params:oauth:grant-type:device_code',
    REFRESH_TOKEN = 'refresh_token'
}

export enum Errors {
    AUTHORIZATION_PENDING = 'authorization_pending',
    SLOW_DOWN = 'slow_down',
    ACCESS_DENIED = 'access_denied',
    EXPIRED_TOKEN = 'expired_token'
}

export type Tokens = {
    REFRESH_TOKEN: string
    ACCESS_TOKEN: string
}

export type Secret = {
    CLIENT_ID: string
    CLIENT_SECRET: string
    CHALLENGE: string
    CHALLENGE_METHOD: string
    VERIFIER: string
}

export type AuthorizationData = {
    DEVICE_CODE: string,
    VERIFICATION_URI: string,
    VERIFICATION_URI_COMPLETE: string,
    USER_CODE: string,
    EXPIRES_IN: number,
    INTERVAL: number
}

export class Client {

    private readonly secret: Secret = {
        CLIENT_ID: undefined,
        CLIENT_SECRET: undefined,
        CHALLENGE: undefined,
        CHALLENGE_METHOD: 'S256',
        VERIFIER: undefined,
    };
    private readonly tokens: Tokens = {
        REFRESH_TOKEN: undefined,
        ACCESS_TOKEN: undefined
    };
    private readonly authorizationData: AuthorizationData = {
        DEVICE_CODE: undefined,
        VERIFICATION_URI: undefined,
        VERIFICATION_URI_COMPLETE: undefined,
        USER_CODE: undefined,
        EXPIRES_IN: 3600,
        INTERVAL: 5
    };
    private static readonly REFRESH_TOKEN_STORAGE_KEY: string = 'NAVIGRAPH_REFRESH_TOKEN';

    private interval: number = undefined;
    private renewInterval: number = undefined;

    get initAuthenticateRequest(): { headers: { "Content-Type": string }; method: string; body: URLSearchParams } {
        return {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
            body: new URLSearchParams({
                    client_id: this.secret.CLIENT_ID,
                    client_secret: this.secret.CLIENT_SECRET,
                    code_challenge: this.secret.CHALLENGE,
                    code_challenge_method: this.secret.CHALLENGE_METHOD,
                }
            )
        }
    }

    get authenticatePollingRequest(): { headers: { "Content-Type": string }; method: string; body: URLSearchParams } {
        return {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
            body: new URLSearchParams({
                grant_type: GrantType.DEVICE_CODE,
                device_code: this.authorizationData.DEVICE_CODE,
                client_id: this.secret.CLIENT_ID,
                client_secret: this.secret.CLIENT_SECRET,
                scope: 'openid charts offline_access',
                code_verifier: this.secret.VERIFIER,
            })
        }
    }

    get refreshAccessTokenRequest(): { headers: { "Content-Type": string }; method: string; body: URLSearchParams } {
        return {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
            body: new URLSearchParams({
                grant_type: GrantType.REFRESH_TOKEN,
                client_id: this.secret.CLIENT_ID,
                client_secret: this.secret.CLIENT_SECRET,
                refresh_token: this.tokens.REFRESH_TOKEN
            })
        }
    }

    constructor() {
        this.prepareSecret();
        this.tryRetrieveRefreshToken();
    }

    private prepareSecret(): void {
        const _pkce = pkce();
        this.secret.CLIENT_ID = process.env.NAVIGRAPH_ID;
        this.secret.CLIENT_SECRET = process.env.NAVIGRAPH_SECRET;
        this.secret.CHALLENGE_METHOD = 'S256';
        this.secret.CHALLENGE = _pkce.code_challenge;
        this.secret.VERIFIER = _pkce.code_verifier;
    }

    private async tryRetrieveRefreshToken(): Promise<void> {
        const refreshToken = await GetStoredData(Client.REFRESH_TOKEN_STORAGE_KEY);
        if (refreshToken) {
            this.tokens.REFRESH_TOKEN = refreshToken;
        } else {
            this.tokens.REFRESH_TOKEN = undefined;
        }
    }

    private async storeRefreshToken(refreshToken: string): Promise<void> {
        await SetStoredData(Client.REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }

    public getUserCode(): string {
        return this.authorizationData.USER_CODE;
    }

    public getVerificationUri(): string {
        return this.authorizationData.VERIFICATION_URI
    }

    public getVerificationUriComplete(): string {
        return this.authorizationData.VERIFICATION_URI_COMPLETE
    }

    public getAccessToken(): string {
        return this.tokens.ACCESS_TOKEN;
    }

    public async run(): Promise<void> {
        await this.stop();
        if (this.tokens.REFRESH_TOKEN === undefined) {
            if(this.renewInterval){
                await this.stop();
            }
            this.interval = window.setInterval(async (): Promise<void> => {
                if (this.tokens.REFRESH_TOKEN !== undefined) {
                    await this.restart();
                    return;
                }
                await this.authenticate();
                await this.authenticatePolling();
            }, this.authorizationData.INTERVAL * 1000);
        } else {
            if(this.interval){
                await this.stop();
            }
            this.renewInterval = window.setInterval(async (): Promise<void> => {
                if (this.tokens.REFRESH_TOKEN === undefined) {
                    await this.restart();
                    return;
                }
                await this.renewAccessToken()
            }, 3600/8);
        }
    }

    public async stop(): Promise<void> {
        await clearInterval(this.interval);
        await clearInterval(this.renewInterval);
        this.interval = undefined;
        this.renewInterval = undefined;
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.run();
    }

    private async authenticate(): Promise<void> {
        if (this.authorizationData.DEVICE_CODE === undefined) {
            try {
                const response = await fetch(Endpoints.AUTHORIZATION, this.initAuthenticateRequest);
                if (response.ok) {
                    const data = await response.json();
                    this.authorizationData.USER_CODE = data.user_code;
                    this.authorizationData.VERIFICATION_URI = data.verification_uri;
                    this.authorizationData.VERIFICATION_URI_COMPLETE = data.verification_uri_complete;
                    this.authorizationData.INTERVAL = data.interval;
                    this.authorizationData.EXPIRES_IN = data.expires_in;
                    this.authorizationData.DEVICE_CODE = data.device_code;
                }
            } catch (e) {
                console.log("Error init");
            }
        }
    }

    private async authenticatePolling(): Promise<void> {
        try {
            const response = await fetch(Endpoints.TOKEN, this.authenticatePollingRequest);
            if (response.ok) {
                const data = await response.json();
                await this.storeRefreshToken(data.refresh_token);
                this.tokens.REFRESH_TOKEN = data.refresh_token;
                this.tokens.ACCESS_TOKEN = data.access_token;
            } else {
                const data = await response.json();
                switch (data.error) {
                    case Errors.AUTHORIZATION_PENDING:
                        console.log('Authorization Pending.');
                        break;
                    case Errors.SLOW_DOWN:
                        this.authorizationData.INTERVAL += 5;
                        break;
                    case Errors.ACCESS_DENIED:
                        this.tokens.REFRESH_TOKEN = undefined;
                        console.log('Access Denied.');
                        break;
                    case Errors.EXPIRED_TOKEN:
                        await this.renewAccessToken();
                        console.log('Expired Token.');
                        break;
                }
            }
        } catch (e) {
            console.log("Error polling");
        }
    }

    private async renewAccessToken(): Promise<void> {
        try {
            const response = await fetch(Endpoints.TOKEN, this.refreshAccessTokenRequest);
            if (response.ok) {
                const data = await response.json();
                await this.storeRefreshToken(data.refresh_token);
                this.tokens.REFRESH_TOKEN = data.refresh_token;
                this.tokens.ACCESS_TOKEN = data.access_token;
            }
        } catch (e) {
            console.log("Error Renew Token");
        }
    }
}
