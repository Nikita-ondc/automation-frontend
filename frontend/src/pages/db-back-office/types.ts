export interface LoginCredentials {
    username: string;
    password: string;
}

export interface PayloadData {
    domain: string;
    version: string;
    page?: string;
    data: unknown;
}

export interface FetchParams {
    domain: string;
    version: string;
    page: string;
    action: string;
}

export interface FetchFormProps {
    fetchParams: FetchParams;
    isLoading: boolean;
    onFetchParamsChange: (params: FetchParams) => void;
    onFetch: () => void;
}

export interface HeaderProps {
    onLogout: () => void;
}

export interface LoginFormProps {
    credentials: LoginCredentials;
    isLoading: boolean;
    onCredentialsChange: (credentials: LoginCredentials) => void;
    onLogin: (e: React.FormEvent) => void;
}

export interface PayloadDisplayProps {
    payloadData: PayloadData;
}
