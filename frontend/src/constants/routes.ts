/**
 * Route constants for the application
 * All route paths should be defined here and used throughout the project
 */
export const ROUTES = {
    HOME: "/home",
    SCHEMA: "/schema-validation",
    SCENARIO: "/scenario",
    FLOW_TESTING: "/flow-testing",
    LOGIN: "/login",
    PROFILE: "/profile",
    TOOLS: "/tools",
    SELLER_ONBOARDING: "/seller-onboarding",
    PLAYGROUND: "/playground",
    HISTORY: "/history",
    DB_BACK_OFFICE: "/db-back-office",
    ROOT: "/",
    AUTH_HEADER: "/auth-header",
    DEVELOPER_GUIDE: "/developer-guide",
} as const;

/**
 * Type for route paths
 */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
