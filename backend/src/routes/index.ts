import { Router } from "express";
import sessionRoutes from "./sessionRoutes"; // Import session-related routes
import flowRoutes from "./flowRoutes"; // Import flow-related routes
import unitRoutes from "./unitRoutes";
import dbRoutes from "./dbRoutes";
import configRoutes from "./configRoute";
import sellerRoutes from "./sellerRoutes"; // Import seller routes
import imageRoutes from "./imageRoutes"; // Import image routes
import finvuRoutes from "./finvu-routes"; // Import Finvu routes
import formRoutes from "./form-routes"; // Import Form routes

import guideRoutes from "./guideRoutes";
import authRoutes from "./gitLoginRoute"; // Import authentication routes
import healthRoutes from "./healthRoutes"; // Import health check routes
import devGuideRoutes from "./devGuideRoutes";
import aiProxyRoutes from "./aiProxyRoutes";
import scenarioPreferencesRoutes from "./scenarioPreferencesRoutes";
import reportsRoutes from "./reportsRoutes";
import dashboardRoutes from "./dashboardRoutes"; // Import business dashboard routes
import portalRoutes from "./portalRoutes"; // Import Portal Integration API (NP Portal)
const router = Router();

// Mount session-related routes
router.use("/sessions", sessionRoutes);
router.use("/flow", flowRoutes);

router.use("/unit", unitRoutes);
router.use("/db", dbRoutes);
// Business dashboard: shared-password auth + read-only proxy onto automation-db
router.use("/dashboard", dashboardRoutes);
router.use("/config", configRoutes);
router.use("/seller", sellerRoutes); // Add seller routes
router.use("/images", imageRoutes); // Add image routes

// Mount Finvu routes (no prefix - routes have full paths)
router.use(finvuRoutes);
router.use(formRoutes);

router.use("/auth", authRoutes); // Mount authentication routes
router.use("/user", scenarioPreferencesRoutes);
router.use("/reports", reportsRoutes);
router.use("/guide", guideRoutes);
router.use("/health", healthRoutes);
router.use("/dev-guide", devGuideRoutes);
router.use("/ai", aiProxyRoutes);
// Portal Integration API for NP Portal: token auth, problem+json errors
router.use("/v1", portalRoutes);
export default router;
