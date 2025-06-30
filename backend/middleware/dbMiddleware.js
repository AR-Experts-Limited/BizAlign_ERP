const { getDatabaseConnection } = require("../config/database");

module.exports = async (req, res, next) => {
    try {
        const origin = req.headers['origin'];
        let subdomain = "";
        let dbName = "BizAlignDevDB"; // Default DB

        if (origin) {
            const originUrl = new URL(origin);
            const hostParts = originUrl.hostname.split(".");

            if (originUrl.hostname === "localhost") {
                dbName = "test_erp"; // Explicitly set for localhost
            } else if (hostParts.length > 2) {
                subdomain = hostParts[0];
                if (!isNaN(subdomain)) {
                    dbName = "BizAlignDevDB"
                }
                else {
                    dbName = `crm_${subdomain}`;
                }
            }
        }

        console.log("Extracted dbName from Origin:", dbName);

        req.db = await getDatabaseConnection(dbName); // Attach DB connection to request

        next();
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ error: "Database connection failed" });
    }
};